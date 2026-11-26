import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono/600SemiBold';
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk/600SemiBold';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';
import { colorScheme, colors, useReducedMotion } from '@tapago/ui';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useLedgerSubscription } from '@/ledger/store';
import { useToday } from '@/ledger/useToday';
import { startSession, useSession } from '@/session/store';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_600SemiBold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });
  const reducedMotion = useReducedMotion();
  const status = useSession((state) => state.status);
  const uid = useSession((state) => state.user?.uid);
  const needsOnboarding = useSession(
    (state) => state.profile?.onboardingDone === false || state.redoingOnboarding,
  );
  // Aqui na raiz: o onboarding e as abas usam os mesmos listeners.
  useLedgerSubscription(uid, useToday());

  useEffect(() => startSession(), []);

  // O fundo da janela do Android segue o tema: sem isto, aparece o claro nas transições.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.paper).catch(() => undefined);
  }, []);

  // Se uma fonte falhar, o app abre com a fonte do sistema em vez de travar na abertura.
  const ready = (fontsLoaded || fontError !== null) && status !== 'loading';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.paper },
            animation: reducedMotion ? 'fade' : 'fade_from_bottom',
          }}
        >
          <Stack.Protected guard={status === 'signedIn' && !needsOnboarding}>
            <Stack.Screen name="(app)" options={{ title: 'Tá pago' }} />
          </Stack.Protected>
          <Stack.Protected guard={status === 'signedIn' && needsOnboarding}>
            <Stack.Screen name="onboarding" options={{ title: 'Começar · Tá pago' }} />
          </Stack.Protected>
          <Stack.Protected guard={status === 'signedOut'}>
            {/* Sem layout de grupo: o primeiro daqui é para onde vai quem não entrou. */}
            <Stack.Screen name="(auth)/sign-in" options={{ title: 'Entrar · Tá pago' }} />
            <Stack.Screen name="(auth)/sign-up" options={{ title: 'Criar conta · Tá pago' }} />
            <Stack.Screen
              name="(auth)/forgot-password"
              options={{ title: 'Esqueci a senha · Tá pago' }}
            />
          </Stack.Protected>
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
