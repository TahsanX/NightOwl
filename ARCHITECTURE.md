# Architecture

Two rules drive every decision here:

1. **Nothing that could be data is code.** Weights, categories, icons, thresholds and
   providers live in config. Adding a POI category or a scoring factor must not require
   editing a `switch`.
2. **Layers depend on interfaces, not implementations.** Each layer knows only the one
   below it, through a type.

## Backend — MVC

```
HTTP
 │
 ▼
routes/v1.ts ........ URL -> controller. Versioned (/api/v1).
 │
 ▼
controllers/ ........ (C) Validate input (zod), call a service, render a view.
 │                        No business logic, no data access.
 ▼
services/ ........... Business logic. Orchestrates repositories and the
 │                    scoring engine. Knows nothing about HTTP.
 ▼
repositories/ ....... Data access behind interfaces (interfaces.ts).
 │                    One implementation per provider.
 ▼
models/ ............. (M) Domain rules that belong to the data itself,
                          e.g. how reports decay and aggregate.

views/ .............. (V) Response shaping: icons, colours, labels, ordering.
                          The only layer that knows what a screen looks like.
```

`container.ts` is the **composition root**: the single place where concrete providers are
chosen and injected. Nothing below it knows whether places come from Geoapify or
Overpass, or whether reports live in memory or PostGIS. Swapping a provider is a change
to one function; testing a service means passing a fake that satisfies the interface.

### Why views exist in an API

A controller that returns domain objects leaks the domain into every client, and makes
"which icon does a pharmacy get" a decision each client re-implements. `views/poi.view.ts`
resolves icon, colour and label from the category config once, server-side, so the map
draws markers straight from feature properties.

### The HTTP contract

Request and response shapes live in `packages/shared-types/src/api.ts` and are imported by
*both* the backend views and the mobile client. A response-shape change that forgets a
client is a compile error. Breaking changes ship as `/api/v2`, not as edits in place.

## Scoring engine — strategy pattern

`packages/scoring-engine` is pure TypeScript with no framework, no I/O and no provider
knowledge. It can be unit tested, run in a script, or compiled into the app for offline
scoring.

```
ScoringEngine.score(context, profileId)
   │
   ├── for each factor listed in the profile:
   │      registry.get(factorId).compute(context, { options, categories })
   │        -> { value 0..1, confidence 0..1, explanation }
   │
   └── points = value × maxPoints (from config)
       total  = earned / effectiveMaxPoints × 100
```

**Confidence is the important part.** A factor that had little or no data reports low
confidence, and the engine drops it from *both* the earned points and the denominator.
An area with no mapped cameras therefore scores the same as one where cameras were never
relevant — missing data reads as "unknown", never as "bad". This is the single rule that
keeps the score honest in places where OSM coverage is thin.

Factors never see a provider, a database or a request. They receive a `RouteContext` and
return a number with an explanation. That constraint is what makes them safe for
strangers to contribute.

## Config as the version mechanism

`packages/scoring-engine/config/`:

- `poi-categories.json` — every category's icon, colour, tier, weight, provider queries
  and assumed hours. The map legend, the markers and the scoring all read from this one
  file, so they cannot drift apart.
- `profiles.json` — which factors count, for how many points, with what options, per
  travel mode.

Different weights are a different *profile*, not a different build. A fork for a
different city, a different use case, or a different idea of what matters is expected to
start by editing these two files — and `ScoringConfigService` accepts an alternative
config directory so a deployment can supply its own.

## Mobile — MVVM

```
views/screens/ ...... Layout only.
views/components/ ... Presentational. Styled from theme.ts and from feature
                      properties the API supplies — no category switches.
viewmodels/ ......... Hooks holding state and calling the API port.
api/client.ts ....... The port. `RestSafeRouteApi` implements it today; the
                      planned offline build implements the same interface
                      against on-device routing and SQLite, and no screen changes.
```

## Degradation, not failure

Route planning fetches cameras and community reports with `Promise.all` over
fault-tolerant wrappers: if Overpass is rate limited or the database is down, the plan
still returns, and the affected factors drop out of the score for lack of confidence. The
user sees "Not enough data in this area" against that line of the breakdown, which is
true, instead of a lower number, which would not be.
