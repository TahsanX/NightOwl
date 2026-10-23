# Adding a score factor

A factor answers one question about a route with a number between 0 and 1, plus how sure
it is, plus a sentence a user can read. Everything else — weighting, ordering, display —
is handled for you.

This is the main extension point of the project. Street lighting, flood risk, pavement
quality, tree cover, noise, accessibility: all of these are factors nobody has written yet.

## 1. Write the factor

`packages/scoring-engine/src/factors/street-lighting.factor.ts`:

```ts
import type { FactorResult } from '@saferoute/shared-types';
import { clamp01 } from '../geo.js';
import { numberOption } from '../options.js';
import type { FactorEnvironment, ScoreFactor } from '../types.js';

export const streetLightingFactor: ScoreFactor = {
  id: 'street-lighting',
  defaultLabel: 'Lit stretches',

  compute(context, env: FactorEnvironment): FactorResult {
    const targetShare = numberOption(env.options, 'targetShare', 0.9);
    const litM = context.route.steps
      .filter((step) => step.roadClass === 'lit')
      .reduce((sum, step) => sum + step.distanceM, 0);
    const share = litM / Math.max(context.route.distanceM, 1);

    return {
      factorId: 'street-lighting',
      value: clamp01(share / targetShare),
      confidence: litM === 0 ? 0.1 : 0.8,
      explanation: `Street lighting is mapped along ${Math.round(share * 100)}% of this route.`,
      details: { litDistanceM: Math.round(litM) },
    };
  },
};
```

Rules that keep the score trustworthy:

- **`value` is 0..1.** Points come from config; a factor never knows its own weight.
- **`confidence` reflects data, not quality.** No data means low confidence, not a low
  value. The engine drops low-confidence factors from the total entirely — this is how an
  unmapped neighbourhood avoids being scored as a bad one.
- **`explanation` is shown to a user.** Plain language, concrete numbers, no jargon.
- **Stay pure.** No `fetch`, no database, no clock beyond `context.departureTime`. A
  factor gets a `RouteContext` and returns a result. If you need new data, add it to the
  context via a repository and service first.
- **Read tuning from `env.options`** with a documented default, never from a literal.

## 2. Register it

`packages/scoring-engine/src/factors/index.ts` — add it to `builtInFactors`.

## 3. Give it points

`packages/scoring-engine/config/profiles.json` — add an entry to each profile that should
use it. Walking, cycling and driving can weight it differently, or omit it entirely:

```json
{
  "factorId": "street-lighting",
  "label": "Lit stretches",
  "maxPoints": 10,
  "minConfidence": 0.25,
  "options": { "targetShare": 0.9 }
}
```

## 4. Test it

`packages/scoring-engine/test/engine.test.ts` has fixtures to copy. At minimum, assert
that a route with the signal scores above one without it, and that an absence of data
leaves the factor `excluded` rather than scored zero.

```bash
npm test --workspace @saferoute/scoring-engine
```

Nothing else in the codebase needs to change. The breakdown sheet, the API response and
the totals all pick it up from config.

## Adding a POI category instead

Edit `packages/scoring-engine/config/poi-categories.json`. One entry gives the map its
icon and colour, the legend its label, the providers their query strings, and the scoring
its tier and weight:

- `tier: "assistance"` — somewhere you could ask for help (counts even when closed).
- `tier: "activity"` — somewhere that means people are around.
- `tier: "transport"` — a way out of the street.
- `weight` — relative pull within the tier. A corner grocery is `1`; a hospital is `3`.
