import Constants from 'expo-constants';

interface AppConfig {
  apiBaseUrl: string;
  mapStyleUrl: string;
}

/**
 * Runtime configuration comes from app.json `extra` (overridable per build),
 * never from literals scattered through the screens.
 */
export const config: AppConfig = {
  apiBaseUrl:
    (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
    'http://localhost:4000/api/v1',
  mapStyleUrl:
    (Constants.expoConfig?.extra?.mapStyleUrl as string | undefined) ??
    'https://demotiles.maplibre.org/style.json',
};
