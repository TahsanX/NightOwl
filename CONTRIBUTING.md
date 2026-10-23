# Contributing to SafeRoute

SafeRoute is built to be extended by people who know a place better than we do. Local
knowledge about which shops stay open, which roads are main roads in practice, and what
actually matters at night is worth more than any weighting we can guess at.

## Good first contributions

| You want to… | Start here |
| --- | --- |
| Add something the score should consider | [docs/adding-a-score-factor.md](docs/adding-a-score-factor.md) |
| Add a kind of place to the map | `packages/scoring-engine/config/poi-categories.json` |
| Tune the score for your city | `packages/scoring-engine/config/profiles.json` |
| Add a routing or places provider | `apps/backend/src/repositories/interfaces.ts` |

The first three are config or a single new file. None require understanding the whole
system.

## Setup

```bash
npm install
cp apps/backend/.env.example apps/backend/.env
npm run dev:backend      # no API key needed
npm test
```

## Ground rules

**No hardcoding.** If a value might reasonably differ between cities, travel modes or
deployments, it belongs in config. The test is: could someone adapt SafeRoute to their
city without touching `src/`?

**Missing data is unknown, not bad.** Never score an absence as a zero. Report low
confidence and let the engine exclude the factor. Most of the world is under-mapped, and a
score that punishes poorly mapped neighbourhoods is worse than no score.

**No safety claims.** The score measures listed activity and access to assistance. It does
not measure safety, and nothing in the UI, the docs or a commit message should imply it
does. Keep the language factual: "places listed as open", not "safe".

**Respect the shared infrastructure.** Overpass and the public OSRM server are volunteer
resources. Cache, batch and use coarse bounding boxes.

**Layers stay separate.** Controllers validate and delegate; services hold logic;
repositories hold I/O; views shape responses; factors stay pure. See
[ARCHITECTURE.md](ARCHITECTURE.md).

## Pull requests

- One concern per PR.
- Add or update a test when you change scoring behaviour.
- If you change a response shape, change it in `packages/shared-types/src/api.ts` so both
  sides move together — or add `/api/v2` if it breaks existing clients.
- Say which city or data you tested against. "Works in Dhaka at 23:00" is useful review
  information.

## Privacy

Location data is sensitive. Community reports are stored as coarse points and only ever
served aggregated. Do not add anything that would let one user's journey be reconstructed
from the API, and do not log raw coordinates.
