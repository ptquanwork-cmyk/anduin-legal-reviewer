import { existsSync, readFileSync } from 'node:fs';
import type { NextConfig } from 'next';

// Machine-wide Supabase variables may belong to other projects; the project's ignored
// .env.supabase.local wins locally. On Vercel the project's own environment variables apply.
function projectEnv(): Record<string, string> {
  if (!existsSync('.env.supabase.local')) return {};
  return Object.fromEntries(
    readFileSync('.env.supabase.local', 'utf8')
      .split(/\r?\n/)
      .map((l) => /^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/.exec(l))
      .filter((m): m is RegExpExecArray => !!m)
      .map((m) => [m[1], m[2]]),
  );
}
const local = projectEnv();

const config: NextConfig = {
  // The publishable Supabase key is designed for browsers; reuse the existing server variable names.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: local.SUPABASE_URL ?? process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY,
  },
  turbopack: { root: process.cwd() },
  serverExternalPackages: ['pdfjs-dist', 'mammoth', 'nspell', 'dictionary-en', 'dictionary-vi'],
  outputFileTracingIncludes: {
    '/api/**': [
      './node_modules/pdfjs-dist/legacy/build/*.mjs',
      './node_modules/pdfjs-dist/standard_fonts/**',
      './node_modules/dictionary-en/**',
      './node_modules/dictionary-vi/**',
      './src/assets/fonts/**',
    ],
  },
};

export default config;
