// O Expo só substitui `process.env.EXPO_PUBLIC_*` quando o acesso é escrito por extenso.
export const env = {
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  },
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  useEmulator: process.env.EXPO_PUBLIC_USE_EMULATOR === 'true',
  /** Só é preciso em celular físico: o IP do computador na rede local. */
  emulatorHost: process.env.EXPO_PUBLIC_EMULATOR_HOST || 'localhost',
};

export const EMULATOR_PORTS = { auth: 9099, firestore: 8180 } as const;
