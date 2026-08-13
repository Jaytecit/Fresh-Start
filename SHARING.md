# Creature sharing & public creations

Public **Share → link → preview → Open in Solemn Sandbox** for trained models, plus an opt-in **Public creations** library in the Library room.

## Architecture

Shared creatures are stored as canonical **`freshstart-model`** JSON (same format as Save / Export / Import).

| Environment | Storage |
| --- | --- |
| Production (Vercel) | [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) object `shares/{id}.json` (+ optional `catalog/{id}.json`) |
| Local `npm run dev` | Filesystem under `.data/shares/` and `.data/catalog/` (gitignored) via Vite plugin |

Share IDs are random 12-character alphanumeric strings (not sequential).

```
Creator → POST /api/share → Blob/FS (optional catalog sidecar)
Reddit  → GET /share/:id  → HTML preview (OG tags)
Visitor → Open → /?share=:id → fetch /api/share/:id → importModelJson
Library → GET /api/gallery → catalog summaries → Open via same import path
```

**Why catalog sidecars (not one giant index):** concurrent anonymous publishes cannot safely read-modify-write a single `index.json` on Blob. Each listed share writes `catalog/{id}.json` (~1 KB). Gallery lists the `catalog/` prefix.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/share` | Validate + store model JSON; optional public listing; returns `{ id, url, listed }` |
| `GET` | `/api/share/:id` | Return stored model JSON |
| `GET` | `/api/gallery` | Return opt-in public catalog summaries (`{ entries }`) |
| `GET` | `/share/:id` | Human/Reddit HTML page (rewrite → `/api/share-page/:id` in production) |

### POST body

Prefer the wrapper (used by the app):

```json
{ "model": { "...freshstart-model..." }, "listPublic": false }
```

Legacy: raw `freshstart-model` JSON alone still works (`listPublic` defaults false).

Payload: **only** `freshstart-model` JSON (no arbitrary uploads). Listing requires a valid share upload.

## Size & validation limits

Defined in [`src/library/shareLimits.ts`](src/library/shareLimits.ts):

- Max JSON: **256 KB**
- Max joints / bones / muscles: 128 / 192 / 256
- Max NN dims: inputs/hidden/outputs/weights capped; `weightCount` must match MLP layout
- Supported model `version`: **1**
- Name length ≤ 80
- Best-effort POST rate limit: 10 / minute / IP (per serverless isolate)
- Gallery response capped at **100** newest listed entries

Untrusted input is validated on the server by self-contained [`api/_lib/validateShare.ts`](api/_lib/validateShare.ts) (helpers live under `api/_lib` so Vercel does not treat them as separate functions; ESM imports use `.js` extensions). Opening a share in the app still runs the full client path through [`validateSharePayload`](src/library/shareValidate.ts) → [`importModelJson`](src/library/jsonIO.ts). No `eval`, no HTML from names (escaped on the share page).

## Public creations (C7)

- Opt-in only: Share dialog checkbox **“Also list in Public creations”** (default off).
- Link-only shares stay private-by-obscurity (guessable IDs only).
- Listed entries are discoverable in Library → **Public creations**.
- Open uses the same confirm + `importModelJson` path; does **not** append to the visitor’s saved-models library.
- Catalog entry schema (no weights): `id`, `name`, `task`, `fitness`, joint/bone/muscle counts, NN dims, `version`, `listedAt`.
- No delete UI for others’ listings in v1 (remove catalog blobs from the Vercel Blob dashboard if needed).
- **Jaylabs / Git** are not used for community uploads; suitable later for a small hand-curated Featured list only.

## Open in Solemn Sandbox

1. Share page button goes to `/?share={id}` (does **not** auto-load on the preview URL alone).
2. App confirms before replacing the workspace creature.
3. Import uses the **same** `importModelJson` path as file import.
4. Shared opens **do not** append to the visitor’s saved-models library.

Download JSON from the share page is the stored canonical model and remains importable via **Import JSON**.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `BLOB_STORE_ID` | Production (usual) | Set automatically when a Blob store is connected; used with Vercel OIDC |
| `BLOB_READ_WRITE_TOKEN` | Optional fallback | Static token if OIDC/`BLOB_STORE_ID` is not used |
| `VERCEL_OIDC_TOKEN` | Auto on Vercel | Injected by the platform; do not set manually |

See [`.env.example`](.env.example). Never commit secrets.

Local Vite sharing does **not** need Blob env vars (uses `.data/shares/` + `.data/catalog/`). On Vercel, sharing requires a connected Blob store (`BLOB_STORE_ID` or `BLOB_READ_WRITE_TOKEN`).

## Production deployment

1. Deploy the app to the Vercel project `solemn-sandbox`.
2. Create a Blob store for the project and set `BLOB_READ_WRITE_TOKEN` for Production (and Preview if you want share there too).
3. Confirm [`vercel.json`](vercel.json) rewrites: `/share/:id` → share page API; SPA fallback for other routes.
4. Hard-refresh `/share/{id}` must work without visiting the homepage first.
5. Share with the Public creations checkbox → entry appears under Library → Public creations after refresh.

## Expiry / cost

Shares are **long-lived** (no short auto-expiry) so Reddit posts stay useful. Anonymous permanent storage has a cost; if Blob usage grows, consider documented cleanup later. Do not silently expire shares after days.

## Known limitations

- Share requires a **trained elite** (body + brain). Creature-only JSON is not a share target in v1.
- Duplicate identical models create separate share IDs (no content-hash dedupe yet).
- Social card **images** are not generated; title/description OG tags are.
- Rate limiting is best-effort inside serverless isolates.
- Gallery has no search, likes, accounts, or moderation tools.

## Future (not built)

Gallery accounts, likes, leaderboards, fork lineage, private shares, Featured shelf (static JSON / Jaylabs) — the Blob key layout (`shares/{id}.json`, `catalog/{id}.json`) can support them later without changing the model format.

## Tests

```bash
npm run smoke:share
```
