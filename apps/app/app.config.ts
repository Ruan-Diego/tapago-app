import type { ExpoConfig } from 'expo/config';

// Só Android e web (sem iOS: ver docs/ROADMAP.md, aba 0).
const config: ExpoConfig = {
  name: 'Tá pago',
  slug: 'tapago',
  scheme: 'tapago',
  version: '0.1.0',
  platforms: ['android', 'web'],
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  backgroundColor: '#F4F4F1',
  android: {
    package: 'com.tapago.app',
    // O arquivo fica fora do git. No CI/EAS dá para apontar outro caminho pela variável.
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    // Alarme exato para o aviso do timer: a primeira vale no Android 12, a segunda no 13+.
    permissions: ['android.permission.SCHEDULE_EXACT_ALARM', 'android.permission.USE_EXACT_ALARM'],
  },
  web: {
    bundler: 'metro',
    output: 'single',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-notifications',
    ['expo-splash-screen', { backgroundColor: '#F4F4F1' }],
    // O Firebase Android atual é compilado com Kotlin 2.4; o padrão do Expo (2.2) não o lê.
    ['expo-build-properties', { android: { kotlinVersion: '2.3.21' } }],
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    '@react-native-firebase/crashlytics',
    './plugins/withLocalAndroidBuild',
  ],
};

export default config;
