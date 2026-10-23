# SafeRoute

Safety-first navigation. Instead of only asking *which route is fastest*, SafeRoute
compares routes by how much **open activity and assistance** sits along them, and shows
its full reasoning.

The headline number is the **Night Activity Score** (0–100). It is an activity estimate,
not a safety rating, and the app always shows what produced it.

```text
Fastest route · 10 min   Night Activity Score 27/100   18 places listed as open
Higher activity · 12 min Night Activity Score 63/100   50 places listed as open
```

## What it does

- Compares the fastest route with a higher-activity alternative, side by side.
- Explains every point of the score: open places, main roads, help points, gaps between
  open places, transport, turns, mapped cameras, community feedback.
- Marks hospitals, police stations, pharmacies, petrol stations, shops, restaurants,
  offices and transport stops on the map, each with its own icon and colour, dimmed when
  they are expected to be closed at the time you pass them.
- Treats missing data as *unknown*, never as *bad* — an unmapped area is not a low score.

## Repository layout

```text
apps/
  backend/          Express API, MVC (see ARCHITECTURE.md)
  mobile/           Expo + MapLibre app
packages/
  scoring-engine/   The Night Activity Score. Framework-agnostic, plugin-based.
  shared-types/     The domain model and the HTTP contract, shared by both apps.
```

## Running it

Requires Node 22+.

```bash
git clone https://github.com/TahsanX/NightOwl.git
cd NightOwl
npm install
cp apps/backend/.env.example apps/backend/.env   # works unchanged, no API key needed
npm run dev:backend                              # http://localhost:4000/health
```

The backend runs with **no API keys**: it falls back to the keyless Overpass API for
places. Set `GEOAPIFY_API_KEY` for better coverage and normalised opening hours.

```bash
npm run dev:mobile    # Expo; needs a dev build because MapLibre is native
```

Community reports are kept in memory by default. For a durable store:

```bash
docker compose up -d db
psql "$DATABASE_URL" -f apps/backend/db/schema.sql
# then set REPORT_STORE=postgis in apps/backend/.env
```

## Try the API

```bash
curl -X POST http://localhost:4000/api/v1/routes/plan \
  -H 'Content-Type: application/json' \
  -d '{"origin":[90.4125,23.8103],"destination":[90.3742,23.7461],"mode":"walking"}'
```

## Where the data comes from

| Layer | Source | Notes |
| --- | --- | --- |
| Roads & routing | OSRM over OpenStreetMap | GraphHopper is a drop-in alternative |
| Places & opening hours | Geoapify Places, else Overpass | `opening_hours` parsed per place |
| Surveillance cameras | OpenStreetMap `man_made=surveillance` via Overpass | positions and tags only, no video |
| Community feedback | SafeRoute users | time-decayed, confidence-weighted |

See [docs/data-sources.md](docs/data-sources.md) for the reasoning behind each choice,
including why city traffic-camera feeds were rejected.

## Contributing

The scoring engine is built so that a new scoring factor is one new file plus one config
entry — start at [docs/adding-a-score-factor.md](docs/adding-a-score-factor.md), and read
[CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

MIT — see [LICENSE](LICENSE).

**SafeRoute cannot tell you that a route is safe.** It estimates how much open activity
and assistance is listed along it, from imperfect public data. Use your own judgement.
