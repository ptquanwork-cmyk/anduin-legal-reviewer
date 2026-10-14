# Brief: build the working single-page application

Date: 15 October 2026. Public-safe summary of the owner's request; private planning material stays local.

## Request

Build the real Legal Reviewer web application on the existing Vercel project and Supabase backend, following the first overall plan, `design/design.md` and `design/UI Master.md`, so judges can use it from the live link before the 18 October 2026 deadline.

## Decisions confirmed with the owner

| Topic | Decision |
| --- | --- |
| Structure | One page: the 3D workflow hub plus nine section workspaces, Templates and Feedback |
| Visual fidelity | Follow each approved screen closely; one shared pill-style stage strip across screens |
| 3D | Stations modelled in Blender and rendered in the browser; the approved PNG objects are the fallback |
| Transitions | The selected station's object flies from the hub to the screen header; panels slide in |
| Semantic review | Server-side model API for contradictions and ambiguities, behind the evidence validator (temporarily the owner's Codex CLI in the worker; see the 15 Oct follow-up brief) |
| Decision agent | Laya typed decisions in a separately hosted worker (with Word→PDF conversion), used for routing steps and ordering findings; scores shown as not calibrated |
| Access | Anonymous private workspace per visitor (row-level security) |
| Languages | Interface in English; contracts in English and Vietnamese |
| Theme | Follows the system setting, with a toggle in the account menu |
| Hosting | The application replaces the static hub at the production URL |
| Scope | All nine screens process real data; intake through decision/report get the deepest checks |

## Boundaries

- Public interface copy stays provider-neutral.
- Findings require matched source quotes; confirmation is not resolution; final export requires passed QA and human confirmation.
- Secrets are entered by the owner into environment settings; they are never committed or typed into files by the development agent.
- No hackathon submission is made by the development agent.
