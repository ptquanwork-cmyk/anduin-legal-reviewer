# OpenAI integration plan — not implemented

1. Select a model based on task quality, latency, and cost using actual test results. No project model is selected yet.
2. Add a server-side client under `src/integrations/`; read credentials from environment configuration.
3. Send trusted reviewer instructions separately from extracted document data and its locations.
4. Request the supported structured output format after testing the project schema against the chosen model/API.
5. Handle refusals, incomplete responses, network errors, timeouts, and validation failures explicitly.
6. Match returned excerpts to the source and preserve conflicting passages together.
7. Pass validated findings to the reviewer interface and persist reviewer decisions separately.
8. Record the model identifier, prompt/schema versions, actual settings, dataset, timing, usage, and limitations in experiments.

No API request, key configuration, model benchmark, or deployment was performed for the repository scaffold. Verify current API details before implementation using [official sources](sources.md).
