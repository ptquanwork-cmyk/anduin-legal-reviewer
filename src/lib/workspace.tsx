'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ensureSession, supabase } from './supabase';
import type {
  AnnotationRow,
  BlockRow,
  DecisionRow,
  DocumentRow,
  EdgeRow,
  ExportRow,
  FindingRow,
  JobRow,
  SubmissionRow,
  VersionRow,
} from './types';

export interface RecentVersion extends VersionRow {
  documents: { title: string } | null;
}

interface WorkspaceState {
  ready: boolean;
  authError: string | null;
  versionId: string | null;
  setVersionId: (id: string | null) => void;
  recent: RecentVersion[];
  version: VersionRow | null;
  document: DocumentRow | null;
  siblings: VersionRow[];
  blocks: BlockRow[];
  edges: EdgeRow[];
  findings: FindingRow[];
  decisions: DecisionRow[];
  annotations: AnnotationRow[];
  submission: SubmissionRow | null;
  exports: ExportRow[];
  job: JobRow | null;
  reload: () => Promise<void>;
  reloadRecent: () => Promise<void>;
}

const Ctx = createContext<WorkspaceState | null>(null);

export function useWorkspace() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWorkspace outside provider');
  return ctx;
}

/** Latest decision per finding (decision_events are append-only). */
export function latestDecision(decisions: DecisionRow[], findingId: string) {
  let latest: DecisionRow | undefined;
  for (const d of decisions) if (d.finding_id === findingId && (!latest || d.created_at > latest.created_at)) latest = d;
  return latest;
}

export function WorkspaceProvider({
  versionId,
  setVersionId,
  children,
}: {
  versionId: string | null;
  setVersionId: (id: string | null) => void;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentVersion[]>([]);
  const [data, setData] = useState<Omit<WorkspaceState, 'ready' | 'authError' | 'versionId' | 'setVersionId' | 'recent' | 'reload' | 'reloadRecent'>>(empty());

  const reloadRecent = useCallback(async () => {
    const { data: rows } = await supabase()
      .from('document_versions')
      .select('*, documents(title)')
      .order('created_at', { ascending: false })
      .limit(12);
    setRecent((rows ?? []) as RecentVersion[]);
  }, []);

  const reload = useCallback(async () => {
    if (!versionId) {
      setData(empty());
      return;
    }
    const sb = supabase();
    const { data: version } = await sb.from('document_versions').select('*').eq('id', versionId).maybeSingle();
    if (!version) {
      setData(empty());
      return;
    }
    const [doc, siblings, blocks, edges, findings, annotations, submission, exports, job] = await Promise.all([
      sb.from('documents').select('*').eq('id', version.document_id).maybeSingle(),
      sb.from('document_versions').select('*').eq('document_id', version.document_id).order('version_no'),
      sb.from('source_blocks').select('*').eq('version_id', versionId).order('idx'),
      sb.from('graph_edges').select('*').eq('version_id', versionId),
      sb.from('findings').select('*').eq('version_id', versionId).order('seq'),
      sb.from('annotations').select('*').eq('version_id', versionId).order('page').order('created_at'),
      sb.from('submissions').select('*').eq('version_id', versionId).maybeSingle(),
      sb.from('exports').select('*').eq('version_id', versionId).order('created_at', { ascending: false }),
      sb.from('jobs').select('*').eq('version_id', versionId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    const findingIds = (findings.data ?? []).map((f) => f.id);
    const decisions = findingIds.length
      ? await sb.from('decision_events').select('*').in('finding_id', findingIds).order('created_at')
      : { data: [] };
    setData({
      version: version as VersionRow,
      document: (doc.data as DocumentRow) ?? null,
      siblings: (siblings.data ?? []) as VersionRow[],
      blocks: (blocks.data ?? []) as BlockRow[],
      edges: (edges.data ?? []) as EdgeRow[],
      findings: (findings.data ?? []) as FindingRow[],
      decisions: (decisions.data ?? []) as DecisionRow[],
      annotations: (annotations.data ?? []) as AnnotationRow[],
      submission: (submission.data as SubmissionRow) ?? null,
      exports: (exports.data ?? []) as ExportRow[],
      job: (job.data as JobRow) ?? null,
    });
  }, [versionId]);

  useEffect(() => {
    ensureSession()
      .then(() => setReady(true))
      .catch((e) => setAuthError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    if (!ready) return;
    reloadRecent();
    reload();
  }, [ready, reload, reloadRecent]);

  // Live job state: refresh whenever a job row for this workspace changes.
  useEffect(() => {
    if (!ready) return;
    const channel = supabase()
      .channel('jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, (payload) => {
        const row = payload.new as JobRow;
        if (row?.version_id === versionId) {
          setData((d) => ({ ...d, job: row }));
          if (row.status !== 'running' && row.status !== 'queued') reload();
          else if (row.steps.some((s) => s.status === 'done')) reload();
        }
        reloadRecent();
      })
      .subscribe();
    return () => {
      supabase().removeChannel(channel);
    };
  }, [ready, versionId, reload, reloadRecent]);

  const value = useMemo<WorkspaceState>(
    () => ({ ready, authError, versionId, setVersionId, recent, reload, reloadRecent, ...data }),
    [ready, authError, versionId, setVersionId, recent, reload, reloadRecent, data],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function empty() {
  return {
    version: null,
    document: null,
    siblings: [],
    blocks: [],
    edges: [],
    findings: [],
    decisions: [],
    annotations: [],
    submission: null,
    exports: [],
    job: null,
  };
}
