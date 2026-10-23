import { useCallback, useMemo, useState } from 'react';
import type { Position, RoutePlanResponse, TravelMode } from '@saferoute/shared-types';
import type { SafeRouteApi } from '../api/client';

interface State {
  status: 'idle' | 'loading' | 'ready' | 'error';
  plan: RoutePlanResponse | null;
  error: string | null;
}

/**
 * View model for the plan screen: holds request state and selection, and keeps
 * every screen free of data-fetching details. Swap the injected api for a fake
 * one and this is testable without a network.
 */
export function useRoutePlan(api: SafeRouteApi) {
  const [state, setState] = useState<State>({ status: 'idle', plan: null, error: null });
  const [mode, setMode] = useState<TravelMode>('walking');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const planRoute = useCallback(
    async (origin: Position, destination: Position) => {
      setState((previous) => ({ ...previous, status: 'loading', error: null }));
      try {
        const result = await api.planRoute({ origin, destination, mode });
        setState({ status: 'ready', plan: result, error: null });
        setSelectedRouteId(result.routes[result.highestActivityRouteIndex]?.id ?? null);
      } catch (error) {
        setState({
          status: 'error',
          plan: null,
          error: error instanceof Error ? error.message : 'Could not plan this route.',
        });
      }
    },
    [api, mode],
  );

  const reset = useCallback(() => {
    setState({ status: 'idle', plan: null, error: null });
    setSelectedRouteId(null);
  }, []);

  const routes = state.plan?.routes ?? [];
  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? routes[0] ?? null,
    [routes, selectedRouteId],
  );

  return {
    status: state.status,
    error: state.error,
    plan: state.plan,
    mode,
    setMode,
    planRoute,
    reset,
    routes,
    selectedRoute,
    selectRoute: setSelectedRouteId,
  };
}
