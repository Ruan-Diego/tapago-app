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
  // Gerados por scripts/icons.ps1 a partir de design/canvas/Marca.dc.html.
  icon: './assets/icon.png',
  android: {
    package: 'com.tapago.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      monochromeImage: './assets/monochrome-icon.png',
      backgroundColor: '#111111',
    },
    // O arquivo fica fora do git. No CI/EAS dá para apontar outro caminho pela variável.
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    // Alarme exato para o aviso do timer: a primeira vale no Android 12, a segunda no 13+.
    permissions: ['android.permission.SCHEDULE_EXACT_ALARM', 'android.permission.USE_EXACT_ALARM'],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    ['expo-notifications', { icon: './assets/notification-icon.png', color: '#111111' }],
    // Só a galeria, pela escolha de fotos do sistema: sem câmera nem microfone.
    ['expo-image-picker', { cameraPermission: false, microphonePermission: false }],
    [
      'expo-splash-screen',
      { backgroundColor: '#F4F4F1', image: './assets/splash-icon.png', imageWidth: 240 },
    ],
    // O Firebase Android atual é compilado com Kotlin 2.4; o padrão do Expo (2.2) não o lê.
    ['expo-build-properties', { android: { kotlinVersion: '2.3.21' } }],
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    '@react-native-firebase/crashlytics',
    './plugins/withLocalAndroidBuild',
  ],
};

export default config;
