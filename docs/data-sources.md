# Data sources

Every number SafeRoute shows comes from public data of uneven quality. This page records
what we use, and why — including the options we rejected.

## Routing — OSRM (OpenStreetMap)

`apps/backend/src/repositories/osrm-routing.repository.ts`

Alternatives are requested directly (`alternatives=3`), because the whole product is a
comparison between them. GraphHopper is a drop-in alternative behind the same
`RoutingRepository` interface.

Caveat: the public demo server is rate limited and does not reliably annotate road
classes. Where road classes are missing, the main-roads factor reports low confidence and
is excluded rather than guessing. Self-host OSRM for real deployments.

## Places and opening hours — Geoapify, else Overpass

`geoapify-places.repository.ts`, `overpass-places.repository.ts`

Geoapify is the default because it normalises OSM `opening_hours`, which the open-places,
help-points and transport factors all need. Without an API key the backend falls back to
the keyless Overpass API, so a fresh clone runs.

Opening hours are parsed with the `opening_hours` package against the time the traveller
is expected to *pass that place*, not departure time — on a 40-minute walk, the far end of
the route is evaluated 40 minutes later.

The parse is three-state: `open`, `closed`, `unknown`. Unparseable or absent expressions
are `unknown` and are never counted as closed. Categories with genuinely predictable hours
carry an `assumedHours` fallback in config (a hospital is `24/7`); most do not.

**Coverage is thin in many regions.** A small grocery shop (the most common night-time
open place in much of South Asia) is often untagged or tagged without hours. This is why
density-type categories carry lower `weight` than staffed assistance points, and why the
confidence mechanism exists at all.

## Surveillance cameras — OpenStreetMap, via Overpass

`overpass-camera.repository.ts`

Camera **positions and tags only** — `man_made=surveillance`, with `surveillance`,
`surveillance:type` and `camera:direction` when mapped. No video, no streams, no imagery.

### Why not city traffic-camera feeds

[bilawalsidhu/gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view) builds its
camera layer by stitching together roughly fifteen regional traffic-authority feeds —
TxDOT, Caltrans, TfL, 511 Ontario, WSDOT and so on. That works because the set of cities
is fixed and named. It does not generalise: there is no such feed for Dhaka, and a
navigation app cannot have a coverage map shaped like "wherever a transport agency
publishes an API". Several of those feeds also carry licence restrictions (NYC needs a
separate agreement; Florida is personal use only).

The part of that project that *does* generalise is its ALPR layer, which reads camera
locations from OSM one bounding box at a time. That is the approach adopted here: global,
openly licensed, and sparse in a way we can model honestly.

Because OSM camera coverage is so uneven, a route with no mapped cameras reports
confidence `0.15` and is dropped from the score. **No mapped cameras means unsurveyed, not
uncovered**, and the UI says so.

Overpass is a shared volunteer resource: camera results are cached for a day by default
and queried on coarse bounding boxes. Self-host an Overpass instance before putting real
traffic through it.

## Community reports — SafeRoute users

`models/community-report.model.ts`

Raw reports are never served back. They are aggregated into ~110 m grid cells with a
60-day half-life, and unvalidated reports carry 60% weight. A cell needs about five
effective reports before it reaches full confidence; below that the factor is dropped.

The aggregation lives in the model, shared by the in-memory and PostGIS stores, so a
development run and a production deployment cannot interpret feedback differently.

## Map rendering — MapLibre

The demo style is configured by default. Marker icons are Maki names (`hospital`,
`pharmacy`, `police`, `fuel`, `restaurant`, …) resolved from
`config/poi-categories.json`; a style whose sprite lacks them still renders the coloured
circles.
