# Application source — planned

The static project hub is implemented in `app/public/index.html` and deployed on Vercel. The contract-review application will live here; its runtime is not implemented yet.

- `app/`: upload/review/export interface and application state.
- `review/`: extraction, deterministic checks, finding assembly, evidence validation.
- `integrations/`: server-side OpenAI and optional external adapters.

Add actual installation, launch, configuration, and deployment instructions when choosing and implementing the runtime. Existing nested upstream checkouts are references and are not part of a fresh clone of this repository.
