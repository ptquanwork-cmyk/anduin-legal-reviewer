# Brief: desktop full-bleed layout, screen polish, temporary CLI reviewer

Date: 15 October 2026. Public-safe summary of the owner's follow-up requests to the runtime build.

## Requests

1. Leave the OpenAI API for later; continue polishing each screen against the approved design images and improve the Blender models.
2. No mobile layout: the application targets desktop web browsers only.
3. The page must fill the browser window edge to edge (no empty side bands on wide screens).
4. Use the owner's Codex CLI on the laptop for the semantic reviewer for now, because the API key has no credit yet.

## Resulting decisions

| Topic | Decision |
| --- | --- |
| Layout | Height sets the scale; extra window width widens the content area between the left rail and the right-edge controls. Windows narrower than 3:2 keep the reference frame, centred |
| Mobile | Mobile layout removed |
| Semantic engine | Worker endpoint `/semantic` runs the locked-down Codex CLI with the same prompt file and schema as the API path; the API path stays and falls back to the CLI when the key is rejected or unfunded |
| Public copy | Unchanged: the interface still names the "semantic reviewer" without a vendor |
