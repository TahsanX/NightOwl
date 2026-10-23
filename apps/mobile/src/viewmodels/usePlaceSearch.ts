import { useEffect, useState } from 'react';
import type { PlaceSearchResult, Position } from '@saferoute/shared-types';
import type { SafeRouteApi } from '../api/client';

/** Waits for a pause in typing so each keystroke doesn't spend API quota. */
const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

export function usePlaceSearch(api: SafeRouteApi, near: Position | null) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const text = query.trim();
    if (text.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Aborting the previous request means a slow early response can never
    // overwrite the results for what the user has typed since.
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.searchPlaces(text, near ?? undefined, controller.signal);
        setResults(response.results);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Search failed.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [api, near, query]);

  const clear = () => {
    setQuery('');
    setResults([]);
  };

  return { query, setQuery, results, loading, error, clear };
}
