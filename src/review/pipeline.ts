import type { SupabaseClient } from '@supabase/supabase-js';
import type { AnnotationType, JobStep, Routing, SourceIssue, SourceReport, VersionRow } from '../lib/types';
import { convertDocx, decide, decideBatch, WorkerUnavailable } from '../integrations/worker';
import { acroFields, detectFields, transferStates } from '../digitize/fields';
import { download } from '../integrations/supabase-server';
import { allRows } from '../lib/rows';
import { runRules, type Speller } from './checks';
import { blocksFromDocx, extractPdf, inspectDocx } from './extract';
import type { Block, Edge, Finding } from './model';
import { semanticEngine, semanticReview, type Example } from './semantic';
import { compareConversion, coverage, sourceStatus } from './source';
import { detectLanguage, jaccard, shingles } from './text';
import { validate } from './validate';

export const STEPS: { key: string; label: string }[] = [
  { key: 'received', label: 'Received' },
  { key: 'duplicates', label: 'Duplicate lookup' },
  { key: 'source', label: 'Source checks' },
  { key: 'routing', label: 'Decision agent routing' },
  { key: 'review', label: 'Legal review checks' },
  { key: 'fields', label: 'Field detection' },
];

export function initialSteps(): JobStep[] {
  return STEPS.map((s, i) => ({ ...s, status: i === 0 ? 'done' : 'queued', detail: i === 0 ? 'Original stored unchanged.' : undefined }));
}

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const spellers: Partial<Record<'en' | 'vi', Promise<Speller | null>>> = {};

function speller(lang: 'en' | 'vi') {
  spellers[lang] ??= (async () => {
    try {
      const nspell = (await import('nspell')).default;
      const dict = lang === 'vi' ? (await import('dictionary-vi')).default : (await import('dictionary-en')).default;
      return nspell(dict as never) as unknown as Speller;
    } catch (e) {
      console.error('spell dictionary unavailable', e);
      return null;
    }
  })();
  return spellers[lang]!;
}

/**
 * Database writes from the pipeline retry briefly on network errors ("fetch failed"), so one blip does not fail the
 * whole job. The tables written this way have unique keys, so a retry whose first attempt already landed reports a
 * duplicate key, which counts as success; nothing is written twice.
 */
async function written<T extends { error: { message: string; code?: string } | null }>(op: () => PromiseLike<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await op();
    if (!res.error) return res;
    if (attempt > 0 && res.error.code === '23505') return { ...res, error: null };
    if (attempt >= 3 || !/fetch failed|network|ECONNRESET|ETIMEDOUT|socket/i.test(res.error.message)) return res;
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
}

export async function runPipeline(sb: SupabaseClient, userId: string, versionId: string, jobId: string) {
  const steps = initialSteps();
  const set = async (key: string, status: JobStep['status'], detail?: string) => {
    const s = steps.find((x) => x.key === key)!;
    s.status = status;
    s.detail = detail;
    await sb.from('jobs').update({ steps, status: 'running', updated_at: new Date().toISOString() }).eq('id', jobId);
  };

  try {
    await sb.from('jobs').update({ status: 'running', steps }).eq('id', jobId);
    const { data: v, error } = await sb.from('document_versions').select('*').eq('id', versionId).single();
    if (error || !v) throw new Error(error?.message ?? 'Version not found');
    const version = v as VersionRow;
    const original = await download(sb, 'sources', version.file_path);
    const report: SourceReport = { issues: [], limitations: [], duplicates: version.source_report?.duplicates ?? [] };
    const routing: Routing = {};

    // 1. Source: convert Word, extract text with geometry, compare.
    await set('source', 'running');
    let blocks: Block[] = [];
    let pdfPath: string | null = version.mime === 'application/pdf' ? version.file_path : null;
    let pageSizes: { n: number; width: number; height: number }[] = [];
    if (version.mime === DOCX) {
      const docx = await inspectDocx(original);
      try {
        // Word renders the PDF. A failed conversion or any text difference triggers one automatic re-conversion; the
        // better attempt is kept and both are noted, so a transient Word hiccup never reaches the reviewer.
        let best: { conv: Awaited<ReturnType<typeof convertDocx>>; pdf: Awaited<ReturnType<typeof extractPdf>>; cmp: ReturnType<typeof compareConversion> } | null = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const conv = await convertDocx(original, version.file_name);
            const pdf = await extractPdf(conv.pdf);
            const cmp = compareConversion(docx, pdf);
            const diff = (c: typeof cmp) => (c.text_diff?.missing.length ?? 0) + (c.text_diff?.extra.length ?? 0);
            if (!best || diff(cmp) < diff(best.cmp)) best = { conv, pdf, cmp };
            if (!diff(cmp)) break;
          } catch (e) {
            if (e instanceof WorkerUnavailable && !best) throw e;
            if (attempt === 2 && !best) throw e;
          }
          if (attempt === 1) report.limitations!.push('Word to PDF conversion was retried automatically once.');
        }
        const { conv, pdf, cmp } = best!;
        pdfPath = `${userId}/${versionId}/converted.pdf`;
        const up = await sb.storage.from('sources').upload(pdfPath, conv.pdf, { contentType: 'application/pdf', upsert: true });
        if (up.error) throw new Error(`Could not store converted PDF: ${up.error.message}`);
        blocks = pdf.blocks;
        pageSizes = pdf.pages;
        Object.assign(report, cmp, { pages: pdf.pages.length, coverage: coverage(pdf.pages), converted_by: `${conv.converter} (${conv.elapsedMs} ms)` });
        report.issues = [...(report.issues ?? [])];
      } catch (e) {
        if (!(e instanceof WorkerUnavailable)) throw e;
        blocks = blocksFromDocx(docx.paragraphs);
        report.issues!.push({ id: 'converter-offline', kind: 'conversion_failed', title: 'Converter offline', detail: `${e.message} The review below uses Word text without page geometry. Retry conversion when the worker is online.`, severity: 'blocking' });
        report.declared_fonts = docx.declared;
        report.limitations!.push('No converted PDF: page anchors and layout checks are unavailable.');
      }
    } else {
      try {
        const pdf = await extractPdf(original);
        blocks = pdf.blocks;
        pageSizes = pdf.pages;
        report.pages = pdf.pages.length;
        report.embedded_fonts = pdf.fonts;
        report.coverage = coverage(pdf.pages);
        for (const n of report.coverage.unread_pages) report.issues!.push({ id: `unread-${n}`, kind: 'unread_page', title: `Page ${n} has no extractable text`, detail: 'The page may be scanned. OCR is not available in this build, so this page was not reviewed.', page: n, severity: 'blocking' });
      } catch (e) {
        const password = /password/i.test(String(e));
        report.issues!.push({ id: 'unreadable', kind: password ? 'password' : 'unreadable', title: password ? 'Password-protected PDF' : 'PDF could not be read', detail: String(e).slice(0, 300), severity: 'blocking' });
      }
    }
    report.blocks = blocks.length;
    report.pages_with_text = report.coverage?.read_pages;
    (report as SourceReport & { page_sizes?: unknown }).page_sizes = pageSizes;
    const status = sourceStatus(report.issues as SourceIssue[]);
    const lang = detectLanguage(blocks.map((b) => b.text).join(' '));

    if (blocks.length) {
      const rows = blocks.map((b) => ({ version_id: versionId, idx: b.idx, page: b.page, section_ref: b.section_ref, section_title: b.section_title, kind: b.kind, text: b.text, bbox: b.bbox }));
      for (let i = 0; i < rows.length; i += 500) {
        const ins = await written(() => sb.from('source_blocks').insert(rows.slice(i, i + 500)));
        if (ins.error) throw new Error(`Could not store source blocks: ${ins.error.message}`);
      }
    }
    await sb.from('document_versions').update({ pdf_path: pdfPath, language: lang, source_status: status, source_report: report, status: 'extracted' }).eq('id', versionId);
    await set('source', status === 'verified' ? 'done' : 'done', `${blocks.length} blocks · ${report.issues!.length} source issue(s) · ${status.replace('_', ' ')}`);

    // 2. Related versions by content (exact hash identity was checked at registration).
    await set('duplicates', 'running');
    report.duplicates = [...(report.duplicates ?? []), ...(await similarVersions(sb, versionId, blocks))];
    await sb.from('document_versions').update({ source_report: report }).eq('id', versionId);
    await set('duplicates', 'done', report.duplicates.length ? `${report.duplicates.length} related candidate(s) need comparison` : 'No related versions found');

    if (!blocks.length) {
      for (const k of ['routing', 'review', 'fields']) await set(k, 'skipped', 'No readable source text.');
      await finish(sb, jobId, steps, 'done', versionId, routing, 'source_blocked');
      return;
    }

    // Speed: rules and the semantic reviewer start now, in parallel with the decision agent's routing; the result of
    // the semantic reviewer is only used if routing (when online) says a deep review is worth it.
    const rulesP = speller(lang).then((sp) => runRules(blocks, lang, sp));
    const semanticP: Promise<{ skipped: true } | { sem: Awaited<ReturnType<typeof semanticReview>> } | { error: unknown }> = (async () => {
      if (await overHourlyLimit(sb)) return { skipped: true as const };
      const [rules, examples] = await Promise.all([rulesP, feedbackExamples(sb)]);
      if (examples.length) (routing.notes ??= []).push(`Semantic reviewer received ${examples.length} reviewer example(s) from this workspace.`);
      return { sem: await semanticReview(blocks, rules.definitions, examples, lang) };
    })().catch((error) => ({ error }));

    // 3. Decision agent routes the remaining steps.
    await set('routing', 'running');
    const head = blocks.map((b) => b.text).join('\n').slice(0, 3500);
    try {
      const r = await decide(
        head,
        {
          doc_type: { type: 'choice', instructions: 'What kind of document is this?', criteria: { contract: 'an agreement with obligations between parties', form: 'mainly a form to fill in', other: 'anything else' } },
          has_fillable: { type: 'noul', instructions: 'Does the document contain blanks, checkboxes or fields that a person must fill in?' },
          needs_semantic: { type: 'noul', instructions: 'Does the document contain obligations with deadlines, amounts or conditions that could conflict with each other?' },
        },
        lang,
      );
      Object.assign(routing, { agent: 'online', doc_type: r.answers.doc_type, has_fillable: r.answers.has_fillable, needs_semantic: r.answers.needs_semantic });
      await set('routing', 'done', `${String(r.answers.doc_type.value)} · ${r.elapsedMs ?? '?'} ms`);
    } catch (e) {
      if (!(e instanceof WorkerUnavailable)) console.error(e);
      routing.agent = 'offline';
      await set('routing', 'offline', 'Decision agent offline; all checks run.');
    }

    // 4 and 5 run side by side: the review (rules + semantic reviewer, then the evidence gate) and field detection do
    // not depend on each other.
    const review = async () => {
      await set('review', 'running');
      const rules = await rulesP;
      const candidates = [...rules.findings];
      const wantSemantic = routing.agent !== 'online' || Number(routing.needs_semantic?.value ?? 1) >= 0.25 || head.length >= 3000;
      const s = await semanticP;
      if ('skipped' in s) {
        routing.semantic_review = 'skipped';
        (routing.notes ??= []).push('Hourly semantic review limit reached for this workspace; rules still ran.');
      } else if ('error' in s) {
        const offline = s.error instanceof WorkerUnavailable && semanticEngine() === 'codex';
        if (!offline) console.error('semantic review failed', s.error);
        routing.semantic_review = offline ? 'unconfigured' : 'failed';
        if (offline) (routing.notes ??= []).push('Semantic reviewer offline (runs on the owner’s worker); deterministic checks still ran.');
        else report.limitations!.push(`Semantic review did not complete: ${s.error instanceof Error ? s.error.message.slice(0, 160) : 'error'}`);
      } else if (!wantSemantic) {
        routing.semantic_review = 'skipped';
        (routing.notes ??= []).push('Decision agent judged deep semantic review unnecessary for this document.');
      } else {
        candidates.push(...s.sem.candidates);
        routing.semantic_review = 'run';
        if (s.sem.truncated) report.limitations!.push('Semantic review covered the first sections only (document too long).');
      }
      const { findings, rejected } = validate(candidates, blocks);
      if (rejected.length) report.limitations!.push(...rejected.map((r) => `Rejected "${r.title}": ${r.reason}`));
      await agentAnnotateFindings(findings, routing, lang);
      await storeFindings(sb, versionId, findings, [...rules.edges, ...conflictEdges(findings, blocks)]);
      await sb.from('document_versions').update({ source_report: report, routing, status: 'reviewed' }).eq('id', versionId);
      await set('review', 'done', `${findings.length} finding(s) · ${rejected.length} unsupported candidate(s) rejected`);
    };
    const fields = async () => {
      await set('fields', 'running');
      if (!pdfPath) return set('fields', 'skipped', 'Needs a PDF with page geometry.');
      const n = await storeFields(sb, version, blocks, routing, lang, version.mime === 'application/pdf' ? original : null);
      await set('fields', 'done', `${n.inputs} input field(s), ${n.paragraphs} paragraph region(s), ${n.uncertain} uncertain`);
    };
    await Promise.all([review(), fields()]);
    await finish(sb, jobId, steps, 'done', versionId, routing, 'reviewed');
  } catch (e) {
    console.error('pipeline failed', e);
    const running = steps.find((s) => s.status === 'running');
    if (running) {
      running.status = 'failed';
      running.detail = e instanceof Error ? e.message.slice(0, 300) : String(e);
    }
    await sb.from('jobs').update({ status: 'failed', steps, error: e instanceof Error ? e.message.slice(0, 500) : String(e), updated_at: new Date().toISOString() }).eq('id', jobId);
  }
}

async function finish(sb: SupabaseClient, jobId: string, steps: JobStep[], status: 'done', versionId: string, routing: Routing, vstatus: string) {
  await sb.from('document_versions').update({ routing, status: vstatus }).eq('id', versionId);
  await sb.from('jobs').update({ status, steps, updated_at: new Date().toISOString() }).eq('id', jobId);
}

async function similarVersions(sb: SupabaseClient, versionId: string, blocks: Block[]) {
  const mine = shingles(blocks.map((b) => b.text).join(' '));
  const { data: others } = await sb.from('document_versions').select('id, document_id, file_name, version_no, created_at').neq('id', versionId).order('created_at', { ascending: false }).limit(20);
  const out = [];
  for (const o of others ?? []) {
    const { data: ob } = await allRows<{ text: string }>((a, b) => sb.from('source_blocks').select('text').eq('version_id', o.id).order('idx').range(a, b));
    if (!ob?.length) continue;
    const score = jaccard(mine, shingles(ob.map((b) => b.text).join(' ')));
    if (score >= 0.35) out.push({ version_id: o.id, document_id: o.document_id, file_name: o.file_name, version_no: o.version_no, created_at: o.created_at, kind: 'similar' as const, score: Math.round(score * 100) / 100 });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 5);
}

async function overHourlyLimit(sb: SupabaseClient) {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await sb.from('jobs').select('id', { count: 'exact', head: true }).gte('created_at', since);
  return (count ?? 0) > 20;
}

async function feedbackExamples(sb: SupabaseClient): Promise<Example[]> {
  // Decisions keep a snapshot of their finding, so examples survive re-running checks (which regenerates findings).
  const { data } = await sb.from('decision_events').select('action, reason, note, finding_title, finding_category').eq('use_as_example', true).order('created_at', { ascending: false }).limit(12);
  return (data ?? []).filter((d) => d.finding_title).map((d) => ({ action: d.action, reason: d.reason, note: d.note, title: d.finding_title!, category: d.finding_category ?? '' }));
}

async function agentAnnotateFindings(findings: Finding[], routing: Routing, lang: 'en' | 'vi') {
  if (routing.agent !== 'online' || !findings.length) return;
  const subset = findings.slice(0, 40);
  try {
    const r = await decideBatch(
      subset.map((f) => `${f.title}. ${f.rationale} Evidence: ${f.evidence.map((e) => e.quote).join(' | ')}`),
      {
        needs_counsel: { type: 'noul', instructions: 'Does this issue need confirmation from legal counsel before the contract is digitized?' },
        impact: { type: 'score', instructions: 'How much could this issue affect the parties if left unresolved?', criteria: ['low', 'medium', 'high'] },
      },
      lang,
    );
    subset.forEach((f, i) => (f.provenance.agent = { needs_counsel: r.answers[i].needs_counsel, impact: r.answers[i].impact }));
    (routing.notes ??= []).push(`Decision agent ordered ${subset.length} finding(s) in ${r.elapsedMs ?? '?'} ms.`);
  } catch (e) {
    if (!(e instanceof WorkerUnavailable)) console.error(e);
  }
}

function conflictEdges(findings: Finding[], blocks: Block[]): Edge[] {
  const sec = (idx: number) => blocks.find((b) => b.idx === idx)?.section_ref ?? 'doc';
  return findings
    .filter((f) => f.category === 'contradiction' && f.evidence.length >= 2)
    .map((f) => ({ from_ref: sec(f.evidence[0].block_idx), to_ref: sec(f.evidence[1].block_idx), relation: 'proposed_conflict' as const, status: 'proposed' as const, evidence: { quote: f.title } }));
}

async function storeFindings(sb: SupabaseClient, versionId: string, findings: Finding[], edges: Edge[]) {
  const order = { contradiction: 0, missing_reference: 1, ambiguity: 2, undefined_term: 3, typo: 4 } as const;
  findings.sort((a, b) => order[a.category] - order[b.category]);
  if (findings.length) {
    const ins = await written(() => sb.from('findings').insert(findings.map((f, i) => ({ version_id: versionId, seq: i + 1, category: f.category, title: f.title, rationale: f.rationale, question: f.question, suggestion: f.suggestion, severity: f.severity, evidence: f.evidence, provenance: f.provenance, evidence_status: f.evidence_status, fingerprint: f.fingerprint }))));
    if (ins.error) throw new Error(`Could not store findings: ${ins.error.message}`);
  }
  if (edges.length) await sb.from('graph_edges').insert(edges.map((e) => ({ ...e, version_id: versionId })));
}

async function storeFields(sb: SupabaseClient, version: VersionRow, blocks: Block[], routing: Routing, lang: 'en' | 'vi', sourcePdf: Uint8Array | null) {
  let detected = detectFields(blocks);
  // A fillable PDF's own form fields replace the text-pattern inputs.
  const acro = sourcePdf ? await acroFields(sourcePdf, blocks) : [];
  if (acro.length) detected = [...acro, ...detected.filter((d) => d.type === 'paragraph')];
  if (version.parent_id) {
    const { data: prev } = await allRows<{ field_id: string; label: string; type: AnnotationType; source_block_idx: number }>((a, b) => sb.from('annotations').select('field_id, label, type, source_block_idx').eq('version_id', version.parent_id).order('id').range(a, b));
    const { data: prevBlocks } = await allRows<{ idx: number; text: string }>((a, b) => sb.from('source_blocks').select('idx, text').eq('version_id', version.parent_id).order('idx').range(a, b));
    const textOf = new Map((prevBlocks ?? []).map((b) => [b.idx, b.text as string]));
    detected = transferStates(detected, blocks, (prev ?? []).map((p) => ({ ...p, text: textOf.get(p.source_block_idx) ?? '' })));
  }
  // The decision agent double-checks the type of each proposed input; disagreement or low confidence → uncertain.
  const inputs = detected.filter((x) => x.type !== 'paragraph').slice(0, 40);
  if (routing.agent === 'online' && inputs.length) {
    try {
      const r = await decideBatch(
        inputs.map((d) => blocks.find((b) => b.idx === d.source_block_idx)?.text ?? d.label),
        { field_type: { type: 'choice', instructions: 'What kind of form control does this line need?', criteria: { text_box: 'a blank line for a written answer', radio: 'choose exactly one of several options', checkbox: 'tick any number of options', paragraph: 'text to read, no answer needed' } } },
        lang,
      );
      inputs.forEach((d, i) => {
        const a = r.answers[i].field_type;
        (d as typeof d & { agent?: unknown }).agent = a;
        // Disagreement with the layout heuristic, or a weak answer, sends the region to human confirmation.
        if (a.value !== d.type || (a.confidence ?? 0) < 0.5) d.transfer_state = 'uncertain';
      });
    } catch (e) {
      if (!(e instanceof WorkerUnavailable)) console.error(e);
    }
  }
  if (detected.length) {
    const ins = await written(() => sb.from('annotations').insert(detected.map((d) => ({ version_id: version.id, agent: (d as typeof d & { agent?: unknown }).agent ?? null, field_id: d.field_id, type: d.type, label: d.label, options: d.options, page: d.page, bbox: d.bbox, source_block_idx: d.source_block_idx, required: d.required, transfer_state: d.transfer_state, origin: d.origin, confirmed: d.confirmed && d.transfer_state !== 'uncertain' }))));
    if (ins.error) throw new Error(`Could not store annotations: ${ins.error.message}`);
  }
  return { inputs: detected.filter((d) => d.type !== 'paragraph').length, paragraphs: detected.filter((d) => d.type === 'paragraph').length, uncertain: detected.filter((d) => d.transfer_state === 'uncertain').length };
}
