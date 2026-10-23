// Build-time configuration. Values come from the environment (set per build
// profile in eas.json, or in your shell for local runs) — the app source never
// names a server. Plain JS so both `expo` and `eas` read it without a TS step.

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000/api/v1';
const MAP_STYLE_URL =
  process.env.MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/dark';

const LOCATION_REASON =
  'NightOwl uses your location to plan routes from where you are and to show help points nearby.';

/** @type {import('expo/config').ConfigContext['config'] extends never ? never : any} */
module.exports = ({ config }) => ({
  ...config,
  name: 'NightOwl',
  slug: 'nightowl',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  scheme: 'nightowl',
  icon: './assets/icon.png',
  // MapLibre's React Native bindings are not yet reliable on the new
  // architecture; opt out until they are.
  newArchEnabled: false,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0B0C0E',
  },
  ios: {
    bundleIdentifier: 'com.tahsanx.nightowl',
    supportsTablet: false,
    infoPlist: { NSLocationWhenInUseUsageDescription: LOCATION_REASON },
  },
  android: {
    package: 'com.tahsanx.nightowl',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0B0C0E',
    },
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
    // Added by Expo's template but never used. Location apps get extra scrutiny
    // in review, and testers see every permission on install.
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
  },
  plugins: [
    ['expo-location', { locationWhenInUsePermission: LOCATION_REASON }],
    '@maplibre/maplibre-react-native',
  ],
  owner: 'tahsan_x0',
  extra: {
    apiBaseUrl: API_BASE_URL,
    mapStyleUrl: MAP_STYLE_URL,
    eas: { projectId: '20b0f775-4a8a-4ef0-a52b-e5b5d29af7fd' },
  },
  updates: { url: 'https://u.expo.dev/20b0f775-4a8a-4ef0-a52b-e5b5d29af7fd' },
  runtimeVersion: { policy: 'appVersion' },
});
