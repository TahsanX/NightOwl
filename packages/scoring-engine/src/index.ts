export { ScoringEngine, type ScoringEngineOptions } from './engine.js';
export { FactorRegistry } from './registry.js';
export { PoiCategories } from './catalogue.js';
export { builtInFactors } from './factors/index.js';
export * from './factors/index.js';
export { createDefaultRegistry } from './defaults.js';
export { clamp01, haversineM, lineLengthM, distanceAlongRouteM } from './geo.js';
export { numberOption, stringListOption } from './options.js';
export type {
  FactorEnvironment,
  PoiCategoryCatalogue,
  ScoreFactor,
} from './types.js';
