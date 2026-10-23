import type { PoiCategories } from '@saferoute/scoring-engine';
import type {
  CameraFeatureProperties,
  EvaluatedPoi,
  FeatureCollection,
  LegendEntry,
  PoiFeatureProperties,
  PointFeature,
  SurveillanceCamera,
} from '@saferoute/shared-types';

/**
 * View layer: turns domain objects into what the map needs to draw them.
 *
 * Icon and colour are resolved here, from the category catalogue, so the client
 * never has to carry a category -> icon switch of its own and a new category is
 * purely a config change.
 */

export function poiFeature(
  poi: EvaluatedPoi,
  categories: PoiCategories,
): PointFeature<PoiFeatureProperties> {
  const category = categories.get(poi.categoryId);
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: poi.position },
    properties: {
      id: poi.id,
      name: poi.name ?? null,
      categoryId: poi.categoryId,
      categoryLabel: category?.label ?? poi.categoryId,
      icon: category?.mapIcon ?? 'marker',
      color: category?.mapColor ?? '#8B8D98',
      tier: category?.tier ?? 'activity',
      openingState: poi.openingState,
      distanceFromRouteM: Math.round(poi.distanceFromRouteM),
    },
  };
}

export const poiCollection = (
  pois: readonly EvaluatedPoi[],
  categories: PoiCategories,
): FeatureCollection<PointFeature<PoiFeatureProperties>> => ({
  type: 'FeatureCollection',
  features: pois.map((poi) => poiFeature(poi, categories)),
});

export const cameraCollection = (
  cameras: readonly SurveillanceCamera[],
): FeatureCollection<PointFeature<CameraFeatureProperties>> => ({
  type: 'FeatureCollection',
  features: cameras.map((camera) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: camera.position },
    properties: {
      id: camera.id,
      icon: 'camera',
      color: '#9BA1A6',
      surveillanceType: camera.surveillanceType ?? null,
      directionDeg: camera.directionDeg ?? null,
      source: camera.source,
    },
  })),
});

/** The map legend, derived from config so it can never drift from the markers. */
export const legendView = (categories: PoiCategories): LegendEntry[] =>
  categories.all().map((category) => ({
    categoryId: category.id,
    label: category.label,
    icon: category.mapIcon,
    color: category.mapColor,
    tier: category.tier,
  }));
