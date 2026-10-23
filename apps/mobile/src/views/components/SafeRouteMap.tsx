import {
  Camera,
  CircleLayer,
  LineLayer,
  MapView,
  ShapeSource,
  SymbolLayer,
} from '@maplibre/maplibre-react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import type { RouteCardView, RoutePlanResponse } from '@saferoute/shared-types';
import { config } from '../../config';
import { theme } from '../theme';

interface Props {
  plan: RoutePlanResponse | null;
  selectedRoute: RouteCardView | null;
  showCameras?: boolean;
}

/**
 * Markers are styled from the feature's own `color` and `icon` properties,
 * which the API fills in from the POI category config. Adding a category is
 * therefore a config change on the server — no branch here ever changes.
 *
 * The icon names are Maki ids; whichever map style is configured must ship a
 * sprite containing them, otherwise the coloured circle alone is drawn.
 */
export function SafeRouteMap({ plan, selectedRoute, showCameras = true }: Props) {
  const center = selectedRoute?.geometry.coordinates[0] ?? [90.4125, 23.8103];

  return (
    <MapView style={styles.map} mapStyle={config.mapStyleUrl} logoEnabled={false}>
      <Camera centerCoordinate={center} zoomLevel={14} animationDuration={600} />

      {plan?.routes.map((route) => (
        <ShapeSource
          key={route.id}
          id={`route-${route.id}`}
          shape={{ type: 'Feature', properties: {}, geometry: route.geometry }}
        >
          <LineLayer
            id={`route-line-${route.id}`}
            style={{
              lineColor:
                route.id === selectedRoute?.id
                  ? theme.colors.route
                  : theme.colors.routeAlternative,
              lineWidth: route.id === selectedRoute?.id ? 5 : 3,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </ShapeSource>
      ))}

      {plan && (
        <ShapeSource id="pois" shape={plan.pois}>
          <CircleLayer
            id="poi-dots"
            style={{
              circleRadius: 7,
              circleColor: ['get', 'color'],
              circleStrokeWidth: 1.5,
              circleStrokeColor: theme.colors.background,
              // Closed places stay visible but recede — they are still useful
              // landmarks, they just do not mean "someone is around".
              circleOpacity: ['match', ['get', 'openingState'], 'closed', 0.35, 1],
            }}
          />
          <SymbolLayer
            id="poi-icons"
            style={{
              iconImage: ['get', 'icon'],
              iconSize: 0.75,
              iconAllowOverlap: true,
              textField: ['get', 'name'],
              textSize: 10,
              textColor: theme.colors.textMuted,
              textOffset: [0, 1.4],
              textOptional: true,
            }}
            minZoomLevel={15}
          />
        </ShapeSource>
      )}

      {plan && showCameras && (
        <ShapeSource id="cameras" shape={plan.cameras}>
          <CircleLayer
            id="camera-dots"
            style={{
              circleRadius: 4,
              circleColor: ['get', 'color'],
              circleStrokeWidth: 1,
              circleStrokeColor: theme.colors.background,
            }}
          />
        </ShapeSource>
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
