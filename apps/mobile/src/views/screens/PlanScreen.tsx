import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PlaceSearchResult } from '@saferoute/shared-types';
import { RestSafeRouteApi } from '../../api/rest-client';
import { useCurrentLocation } from '../../viewmodels/useCurrentLocation';
import { usePlaceSearch } from '../../viewmodels/usePlaceSearch';
import { useRoutePlan } from '../../viewmodels/useRoutePlan';
import { DestinationSearch } from '../components/DestinationSearch';
import { ModeSwitcher } from '../components/ModeSwitcher';
import { RouteComparisonCard } from '../components/RouteComparisonCard';
import { SafeRouteMap } from '../components/SafeRouteMap';
import { ScoreBreakdownSheet } from '../components/ScoreBreakdownSheet';
import { theme } from '../theme';

export function PlanScreen() {
  const api = useMemo(() => new RestSafeRouteApi(), []);
  const location = useCurrentLocation();
  const search = usePlaceSearch(api, location.position);
  const routePlan = useRoutePlan(api);

  const [destination, setDestination] = useState<PlaceSearchResult | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0);

  const plan = async (place: PlaceSearchResult) => {
    const origin = await location.refresh();
    if (origin) await routePlan.planRoute(origin, place.position);
  };

  // Switching travel mode re-plans, because each mode is scored with its own
  // profile — the "best" route can genuinely change.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (destination) void plan(destination);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePlan.mode]);

  const onSelect = (place: PlaceSearchResult) => {
    setDestination(place);
    void plan(place);
  };

  const onClear = () => {
    setDestination(null);
    search.clear();
    routePlan.reset();
  };

  const notice = locationNotice(location.status);

  return (
    <View style={styles.screen}>
      <SafeRouteMap
        plan={routePlan.plan}
        selectedRoute={routePlan.selectedRoute}
        userPosition={location.position}
        destination={destination?.position ?? null}
        bottomInset={panelHeight}
      />

      <SafeAreaView style={styles.top} edges={['top']} pointerEvents="box-none">
        <DestinationSearch
          query={search.query}
          onChangeQuery={search.setQuery}
          results={search.results}
          loading={search.loading}
          error={search.error}
          selected={destination}
          onSelect={onSelect}
          onClear={onClear}
        />
        <ModeSwitcher mode={routePlan.mode} onChange={routePlan.setMode} />
        {notice && <Text style={styles.notice}>{notice}</Text>}
      </SafeAreaView>

      {(routePlan.status !== 'idle' || routePlan.routes.length > 0) && (
        <View
          style={styles.panel}
          onLayout={(event) => setPanelHeight(event.nativeEvent.layout.height)}
        >
          {routePlan.status === 'loading' && (
            <View style={styles.loading}>
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={styles.loadingText}>
                Checking what is open along each route…
              </Text>
            </View>
          )}

          {routePlan.error && <Text style={styles.error}>{routePlan.error}</Text>}

          {routePlan.status === 'ready' && (
            <ScrollView
              contentContainerStyle={styles.cards}
              showsVerticalScrollIndicator={false}
            >
              {routePlan.routes.length === 1 && (
                <Text style={styles.singleRoute}>
                  Only one route was found between these points.
                </Text>
              )}
              {routePlan.routes.map((route, index) => (
                <RouteComparisonCard
                  key={route.id}
                  route={route}
                  rank={index + 1}
                  selected={route.id === routePlan.selectedRoute?.id}
                  onPress={() => routePlan.selectRoute(route.id)}
                  onShowBreakdown={() => {
                    routePlan.selectRoute(route.id);
                    setBreakdownOpen(true);
                  }}
                />
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <ScoreBreakdownSheet
        route={routePlan.selectedRoute}
        visible={breakdownOpen}
        onClose={() => setBreakdownOpen(false)}
      />
    </View>
  );
}

function locationNotice(status: ReturnType<typeof useCurrentLocation>['status']): string | null {
  if (status === 'denied') {
    return 'Location is off. NightOwl needs it to plan from where you are — enable it in Settings.';
  }
  if (status === 'error') return 'Could not get your location. Check that GPS is on.';
  return null;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(1),
    gap: theme.spacing(1),
  },
  notice: {
    color: theme.colors.text,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.sm,
    padding: theme.spacing(1.25),
    fontSize: 13,
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '52%',
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(3),
  },
  cards: { gap: theme.spacing(1.5) },
  loading: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.5) },
  loadingText: { color: theme.colors.textMuted, fontSize: 14 },
  error: { color: theme.colors.scoreLow, fontSize: 14 },
  singleRoute: { color: theme.colors.textMuted, fontSize: 12 },
});
