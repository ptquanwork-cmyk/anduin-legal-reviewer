# Application source

Next.js App Router application deployed on Vercel. See the [README](../README.md#architecture) for the architecture and run instructions.

- `app/`: the single page (`page.tsx`), layout, global styles and API routes (`api/versions`, `api/versions/[id]/{process,report,help,fill}`, `api/health`).
- `components/`: shell, 3D hub, nine workspaces, PDF viewer and three.js stations.
- `review/`: extraction, deterministic checks, semantic adapter, evidence validator and the processing pipeline.
- `digitize/`: field detection, annotation QA, form model, PDF fill and read-back QA.
- `integrations/`: Supabase server client and the worker client.
- `lib/`: shared types, navigation, workspace state, uploads, review outcome.
