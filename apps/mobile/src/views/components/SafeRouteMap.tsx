import {
  Camera,
  CircleLayer,
  LineLayer,
  MapView,
  ShapeSource,
  SymbolLayer,
  UserLocation,
} from '@maplibre/maplibre-react-native';
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import type { Position, RouteCardView, RoutePlanResponse } from '@saferoute/shared-types';
import { config } from '../../config';
import { theme } from '../theme';

interface Props {
  plan: RoutePlanResponse | null;
  selectedRoute: RouteCardView | null;
  userPosition: Position | null;
  destination: Position | null;
  /** Space the bottom panel covers, so a fitted route isn't hidden under it. */
  bottomInset: number;
  showCameras?: boolean;
}

/** Dhaka — only used until the first location fix arrives. */
const FALLBACK_CENTER: Position = [90.4125, 23.8103];

/**
 * Markers are styled from each feature's own `color` and `icon` properties,
 * which the API fills in from the POI category config. Adding a category is a
 * server config change — no branch here ever changes. Icon ids match the
 * OpenFreeMap sprite; a style lacking one still draws the coloured dot.
 */
export function SafeRouteMap({
  plan,
  selectedRoute,
  userPosition,
  destination,
  bottomInset,
  showCameras = true,
}: Props) {
  const bounds = useMemo(() => {
    const coordinates = selectedRoute?.geometry.coordinates;
    if (!coordinates?.length) return undefined;
    const lons = coordinates.map(([lon]) => lon);
    const lats = coordinates.map(([, lat]) => lat);
    return {
      ne: [Math.max(...lons), Math.max(...lats)] as Position,
      sw: [Math.min(...lons), Math.min(...lats)] as Position,
      paddingTop: 140,
      paddingBottom: bottomInset + 24,
      paddingLeft: 40,
      paddingRight: 40,
    };
  }, [selectedRoute, bottomInset]);

  // Selected route drawn last so it sits on top of the alternatives.
  const orderedRoutes = useMemo(() => {
    if (!plan) return [];
    return [...plan.routes].sort((a, b) =>
      a.id === selectedRoute?.id ? 1 : b.id === selectedRoute?.id ? -1 : 0,
    );
  }, [plan, selectedRoute]);

  return (
    <MapView
      style={styles.map}
      mapStyle={config.mapStyleUrl}
      logoEnabled={false}
      attributionPosition={{ bottom: bottomInset + 8, right: 8 }}
    >
      {bounds ? (
        <Camera bounds={bounds} animationDuration={700} />
      ) : (
        <Camera
          centerCoordinate={userPosition ?? FALLBACK_CENTER}
          zoomLevel={userPosition ? 15 : 12}
          animationDuration={700}
        />
      )}

      <UserLocation visible animated />

      {orderedRoutes.map((route) => {
        const selected = route.id === selectedRoute?.id;
        return (
          <ShapeSource
            key={route.id}
            id={`route-${route.id}`}
            shape={{ type: 'Feature', properties: {}, geometry: route.geometry }}
          >
            <LineLayer
              id={`route-casing-${route.id}`}
              style={{
                lineColor: theme.colors.background,
                lineWidth: selected ? 9 : 6,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <LineLayer
              id={`route-line-${route.id}`}
              aboveLayerID={`route-casing-${route.id}`}
              style={{
                lineColor: selected ? theme.colors.route : theme.colors.routeAlternative,
                lineWidth: selected ? 5 : 3,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </ShapeSource>
        );
      })}

      {plan && (
        <ShapeSource id="pois" shape={plan.pois}>
          <CircleLayer
            id="poi-dots"
            style={{
              circleRadius: ['interpolate', ['linear'], ['zoom'], 12, 3, 16, 9],
              circleColor: ['get', 'color'],
              circleStrokeWidth: 1.5,
              circleStrokeColor: theme.colors.background,
              // Closed places stay visible but recede: still useful landmarks,
              // they just don't mean someone is around.
              circleOpacity: ['match', ['get', 'openingState'], 'closed', 0.35, 1],
            }}
          />
          <SymbolLayer
            id="poi-icons"
            minZoomLevel={14}
            style={{
              iconImage: ['get', 'icon'],
              iconSize: 0.9,
              iconAllowOverlap: false,
              iconOpacity: ['match', ['get', 'openingState'], 'closed', 0.4, 1],
              textField: ['get', 'name'],
              textSize: 11,
              textColor: theme.colors.textMuted,
              textHaloColor: theme.colors.background,
              textHaloWidth: 1,
              textOffset: [0, 1.3],
              textAnchor: 'top',
              textOptional: true,
            }}
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

      {destination && (
        <ShapeSource
          id="destination"
          shape={{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: destination } }}
        >
          <CircleLayer
            id="destination-pin"
            style={{
              circleRadius: 9,
              circleColor: theme.colors.scoreLow,
              circleStrokeWidth: 3,
              circleStrokeColor: theme.colors.text,
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
