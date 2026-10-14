'use client';
import { api, ensureSession, supabase } from './supabase';

export const ACCEPT = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_BYTES = 20 * 1024 * 1024;

export interface RegisterResult {
  versionId: string;
  documentId: string;
  duplicateOf: string | null;
}

export async function uploadSource(file: File, documentId?: string): Promise<RegisterResult> {
  const lower = file.name.toLowerCase();
  const mime = lower.endsWith('.pdf') ? 'application/pdf' : lower.endsWith('.docx') ? DOCX : null;
  if (!mime) throw new Error('Only .pdf and .docx files are supported.');
  if (file.size > MAX_BYTES) throw new Error('Files up to 20 MB are supported.');
  const session = await ensureSession();
  const safe = file.name.replace(/[^\w.\- ]+/g, '_').slice(-120);
  const path = `${session.user.id}/${crypto.randomUUID()}/${safe}`;
  const { error } = await supabase().storage.from('sources').upload(path, file, { contentType: mime, upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return api<RegisterResult>('/api/versions', { path, fileName: file.name, mime, size: file.size, documentId });
}

export async function demoFile(name = 'Demo agreement.docx', url = '/demo/demo-agreement-v1.docx') {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Demo document is unavailable.');
  return new File([await res.blob()], name, { type: DOCX });
}
