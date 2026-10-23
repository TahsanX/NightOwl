import Constants from 'expo-constants';

interface AppConfig {
  apiBaseUrl: string;
  mapStyleUrl: string;
}

const extra = Constants.expoConfig?.extra ?? {};

/**
 * Runtime configuration, resolved at build time by app.config.ts from the
 * build profile's environment. Screens read it from here and never hold a URL.
 */
export const config: AppConfig = {
  apiBaseUrl: extra.apiBaseUrl as string,
  mapStyleUrl: extra.mapStyleUrl as string,
};
