import type { ExpoConfig } from 'expo/config';

const serverUrl = process.env.EXPO_PUBLIC_GAME_SERVER_URL;
if (process.env.EAS_BUILD_PROFILE === 'production' && !serverUrl?.startsWith('https://')) {
  throw new Error('Production builds require EXPO_PUBLIC_GAME_SERVER_URL pointing to your HTTPS game server.');
}

const config: ExpoConfig = {
  name: 'Last Flame',
  slug: 'last-flame',
  version: '1.0.0',
  scheme: 'lastflame',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  icon: './assets/icon.png',
  backgroundColor: '#0B1118',
  ios: { supportsTablet: true, bundleIdentifier: 'com.lastflame.game' },
  android: { package: 'com.lastflame.game', adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#0B1118' } },
  web: { bundler: 'metro', favicon: './assets/favicon.png', name: 'Last Flame', shortName: 'Last Flame', themeColor: '#0B1118', backgroundColor: '#0B1118' },
  plugins: ['expo-font', 'expo-secure-store', ['expo-splash-screen', { image: './assets/icon.png', imageWidth: 130, backgroundColor: '#0B1118' }], ['expo-audio', { microphonePermission: false, recordAudioAndroid: false, enableBackgroundPlayback: false, enableBackgroundRecording: false }]],
  extra: { gameServerUrl: serverUrl || null },
};

export default config;
