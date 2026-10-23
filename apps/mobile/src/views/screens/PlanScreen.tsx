import * as Location from 'expo-location';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Position } from '@saferoute/shared-types';
import { RestSafeRouteApi } from '../../api/rest-client';
import { useRoutePlan } from '../../viewmodels/useRoutePlan';
import { ModeSwitcher } from '../components/ModeSwitcher';
import { RouteComparisonCard } from '../components/RouteComparisonCard';
import { SafeRouteMap } from '../components/SafeRouteMap';
import { ScoreBreakdownSheet } from '../components/ScoreBreakdownSheet';
import { theme } from '../theme';

export function PlanScreen() {
  const api = useMemo(() => new RestSafeRouteApi(), []);
  const { status, error, plan, planRoute, routes, selectedRoute, selectRoute, mode, setMode } =
    useRoutePlan(api);

  const [destination, setDestination] = useState({ lat: '', lon: '' });
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Destination is entered as coordinates for now; geocoding is a separate
  // feature and does not belong in this screen when it arrives.
  const destinationPosition = (): Position | null => {
    const lon = Number(destination.lon);
    const lat = Number(destination.lat);
    return Number.isFinite(lon) && Number.isFinite(lat) && destination.lon && destination.lat
      ? [lon, lat]
      : null;
  };

  const onPlan = async () => {
    const target = destinationPosition();
    if (!target) {
      setLocationError('Enter a destination latitude and longitude.');
      return;
    }

    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      setLocationError('Location permission is needed to plan from where you are.');
      return;
    }

    setLocationError(null);
    const current = await Location.getCurrentPositionAsync({});
    await planRoute([current.coords.longitude, current.coords.latitude], target);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.mapContainer}>
        <SafeRouteMap plan={plan} selectedRoute={selectedRoute} />
      </View>

      <ScrollView contentContainerStyle={styles.panel}>
        <ModeSwitcher mode={mode} onChange={setMode} />

        <View style={styles.inputs}>
          <TextInput
            style={styles.input}
            placeholder="Destination latitude"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="numbers-and-punctuation"
            value={destination.lat}
            onChangeText={(lat) => setDestination((d) => ({ ...d, lat }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Destination longitude"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="numbers-and-punctuation"
            value={destination.lon}
            onChangeText={(lon) => setDestination((d) => ({ ...d, lon }))}
          />
        </View>

        <Pressable style={styles.primaryButton} onPress={onPlan}>
          <Text style={styles.primaryButtonLabel}>Compare routes</Text>
        </Pressable>

        {status === 'loading' && <ActivityIndicator color={theme.colors.accent} />}
        {(error ?? locationError) && (
          <Text style={styles.error}>{error ?? locationError}</Text>
        )}

        {routes.map((route, index) => (
          <RouteComparisonCard
            key={route.id}
            route={route}
            rank={index + 1}
            selected={route.id === selectedRoute?.id}
            onPress={() => selectRoute(route.id)}
            onShowBreakdown={() => {
              selectRoute(route.id);
              setBreakdownOpen(true);
            }}
          />
        ))}
      </ScrollView>

      <ScoreBreakdownSheet
        route={selectedRoute}
        visible={breakdownOpen}
        onClose={() => setBreakdownOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  mapContainer: { flex: 1, minHeight: 240 },
  panel: { padding: theme.spacing(2), gap: theme.spacing(1.5) },
  inputs: { flexDirection: 'row', gap: theme.spacing(1) },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(1.25),
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing(1.5),
    alignItems: 'center',
  },
  primaryButtonLabel: { color: theme.colors.background, fontWeight: '700', fontSize: 15 },
  error: { color: theme.colors.scoreLow, fontSize: 13 },
});
