import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import type { Position } from '@saferoute/shared-types';

type Status = 'pending' | 'granted' | 'denied' | 'error';

/** Asks once on mount; `refresh` re-reads the fix just before planning. */
export function useCurrentLocation() {
  const [status, setStatus] = useState<Status>('pending');
  const [position, setPosition] = useState<Position | null>(null);

  const refresh = useCallback(async (): Promise<Position | null> => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setStatus('denied');
        return null;
      }
      setStatus('granted');
      const fix = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next: Position = [fix.coords.longitude, fix.coords.latitude];
      setPosition(next);
      return next;
    } catch {
      setStatus('error');
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, position, refresh };
}
