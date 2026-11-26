import {
  ACTIVITY_PRESETS,
  SHOP_PRESETS,
  activeInOrder,
  cheapest,
  hasPositiveSelected,
  isAlreadyConfigured,
  withoutExisting,
  type ActivityPreset,
  type ShopPreset,
} from '@tapago/core';
import { profileRepository } from '@tapago/data';
import {
  Button,
  Logo,
  MIN_TOUCH,
  SIDEBAR_BREAKPOINT,
  colors,
  fonts,
  fontSizes,
  spacing,
} from '@tapago/ui';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { save } from '@/ledger/actions';
import { useLedger } from '@/ledger/store';
import { ActivitiesStep } from '@/onboarding/ActivitiesStep';
import { DoneStep } from '@/onboarding/DoneStep';
import { HowItWorks } from '@/onboarding/HowItWorks';
import { NameStep } from '@/onboarding/NameStep';
import { NotificationsStep } from '@/onboarding/NotificationsStep';
import { ShopStep } from '@/onboarding/ShopStep';
import { Slogan } from '@/onboarding/Slogan';
import { Welcome } from '@/onboarding/Welcome';
import { requestAlertPermission } from '@/platform/notifications';
import { signOut } from '@/session/signOut';
import { useSession } from '@/session/store';

const WELCOME = 0;
const NAME = 2;
const ACTIVITIES = 3;
const SHOP = 4;
const NOTIFICATIONS = 5;
const DONE = 6;
/** Passos com barra de progresso: de "como funciona" às notificações. */
const COUNTED_STEPS = [1, 2, 3, 4, 5];

const plural = (amount: number, one: string, many: string) =>
  `${amount} ${amount === 1 ? one : many}`;

/** Troca o item de mesmo nome. */
const replace = <Item extends { name: string }>(list: Item[], next: Item) =>
  list.map((item) => (item.name === next.name ? next : item));

export default function Onboarding() {
  const wide = useWindowDimensions().width >= SIDEBAR_BREAKPOINT;
  const uid = useSession((state) => state.user?.uid);
  const accountName = useSession((state) => state.profile?.name || state.user?.displayName || '');
  const weekly = useSession((state) => state.profile?.notif.weekly ?? true);
  const activities = useLedger((state) => state.activities);
  const shopItems = useLedger((state) => state.shopItems);
  const ledgerError = useLedger((state) => state.error);

  const [step, setStep] = useState(WELCOME);
  const [typedName, setName] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [activityList, setActivityList] = useState<ActivityPreset[]>([...ACTIVITY_PRESETS]);
  const [shopList, setShopList] = useState<ShopPreset[]>([...SHOP_PRESETS]);
  /** Quis ser avisado; e se o aparelho liberou. */
  const [alerts, setAlerts] = useState({ wanted: false, granted: false });
  const [asking, setAsking] = useState(false);
  const finished = useRef(false);

  const name = typedName ?? accountName;
  const loaded = activities !== null && shopItems !== null;
  // Só nas boas-vindas: quem já passou delas segue o passo a passo, sem o que a conta já tem.
  const configured = step === WELCOME && loaded && isAlreadyConfigured(activities, shopItems);

  // Conta que já usava o app: não há o que configurar.
  useEffect(() => {
    if (!uid || !configured || finished.current) return;
    finished.current = true;
    save(profileRepository.completeOnboarding(uid));
  }, [uid, configured]);

  useEffect(() => {
    if (Platform.OS !== 'android' || step === WELCOME) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setStep((current) => current - 1);
      return true;
    });
    return () => subscription.remove();
  }, [step]);

  const existingActivities = activeInOrder(activities ?? []);
  const existingShop = activeInOrder(shopItems ?? []);
  const visibleActivities = withoutExisting(activityList, existingActivities);
  const visibleShop = withoutExisting(shopList, existingShop);
  const chosenActivities = visibleActivities.filter((preset) => preset.selected);
  const chosenShop = visibleShop.filter((preset) => preset.selected);
  const positives = chosenActivities.filter((preset) => preset.kind === 'positive').length;

  const canContinue =
    (step !== NAME || name.trim() !== '') &&
    (step !== ACTIVITIES ||
      hasPositiveSelected(visibleActivities) ||
      existingActivities.some((item) => item.kind === 'positive')) &&
    (step !== SHOP || chosenShop.length > 0 || existingShop.length > 0);

  const blockedHint =
    step === NAME
      ? 'Escreva o seu nome para seguir.'
      : step === ACTIVITIES
        ? 'Marque ao menos uma atividade que ganha dinheiro.'
        : 'Marque ao menos um lazer.';

  const next = () => setStep((current) => current + 1);

  async function allowAlerts() {
    setAsking(true);
    let granted = false;
    try {
      granted = (await requestAlertPermission()) === 'granted';
    } catch (error) {
      console.warn('Não foi possível pedir a permissão de notificação.', error);
    }
    setAlerts({ wanted: true, granted });
    setAsking(false);
    setStep(DONE);
  }

  function skipAlerts() {
    setAlerts({ wanted: false, granted: false });
    setStep(DONE);
  }

  function finish() {
    if (!uid || finished.current) return;
    finished.current = true;
    // A tela troca sozinha quando `onboardingDone` chega ao cache local.
    save(
      profileRepository.completeOnboarding(uid, {
        profile: {
          name: name.trim(),
          notif: { end: alerts.wanted, warn5: alerts.wanted, weekly },
        },
        avatar: photo,
        activities: chosenActivities.map(({ selected: _selected, ...preset }) => ({
          ...preset,
          description: '',
          // Hábito e aumento por sequência são ligados depois, na própria atividade.
          streakStep: 0,
          habit: null,
        })),
        shopItems: chosenShop.map(({ selected: _selected, ...preset }) => preset),
      }),
    );
  }

  const welcome = step === WELCOME;
  const primaryLabel = welcome
    ? 'Começar'
    : step === ACTIVITIES
      ? `Continuar · ${plural(chosenActivities.length, 'atividade', 'atividades')}`
      : step === SHOP
        ? `Continuar · ${plural(chosenShop.length, 'item', 'itens')}`
        : step === NOTIFICATIONS
          ? 'Ativar notificações'
          : step === DONE
            ? 'Entrar no app'
            : 'Continuar';

  if (!loaded || configured) {
    return (
      <View style={styles.loading}>
        {ledgerError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            Não foi possível carregar a sua conta. Confira a conexão e abra o app de novo.
          </Text>
        ) : (
          <ActivityIndicator accessibilityLabel="Carregando a sua conta" color={colors.ink} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {wide ? (
        <View style={styles.aside}>
          <Logo inverse />
          <View style={styles.pitch}>
            <Text style={styles.headline}>
              {'Primeiro o que\nprecisa ser feito.\n'}
              <Text style={styles.accent}>Depois, tá pago.</Text>
            </Text>
            <Text style={styles.pitchText}>
              Atividade boa vira dinheiro. Atividade ruim tira dinheiro. Lazer custa dinheiro. Você
              nunca mais precisa negociar com você mesmo.
            </Text>
          </View>
          <Slogan />
        </View>
      ) : null}
      <SafeAreaView style={[styles.column, welcome && !wide && styles.dark]}>
        <KeyboardAvoidingView behavior="padding" style={styles.frame}>
          {step > WELCOME && step < DONE ? (
            <View style={styles.top}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voltar"
                onPress={() => setStep((current) => current - 1)}
                style={styles.back}
              >
                <Text style={styles.backText}>‹</Text>
              </Pressable>
              <View
                accessibilityRole="progressbar"
                accessibilityLabel="Progresso"
                accessibilityValue={{ min: 0, max: COUNTED_STEPS.length, now: step }}
                style={styles.progress}
              >
                {COUNTED_STEPS.map((number) => (
                  <View key={number} style={[styles.bar, number <= step && styles.barOn]} />
                ))}
              </View>
              <Text style={styles.stepLabel}>
                {step}/{COUNTED_STEPS.length}
              </Text>
            </View>
          ) : null}

          <ScrollView
            // Cada passo começa do topo.
            key={step}
            contentContainerStyle={[styles.scroll, wide && welcome && styles.scrollWelcome]}
            keyboardShouldPersistTaps="handled"
          >
            {welcome ? (
              <View style={[styles.welcome, wide && styles.welcomeWide]}>
                {/* Na web larga a conversa já está no painel ao lado. */}
                <Welcome chat={!wide} />
              </View>
            ) : step === 1 ? (
              <HowItWorks />
            ) : step === NAME ? (
              <NameStep name={name} photo={photo} onName={setName} onPhoto={setPhoto} />
            ) : step === ACTIVITIES ? (
              <ActivitiesStep
                presets={visibleActivities}
                taken={[...activityList, ...existingActivities].map((item) => item.name)}
                onChange={(preset) => setActivityList((list) => replace(list, preset))}
                onAdd={(preset) => setActivityList((list) => [...list, preset])}
              />
            ) : step === SHOP ? (
              <ShopStep
                presets={visibleShop}
                taken={[...shopList, ...existingShop].map((item) => item.name)}
                onChange={(preset) => setShopList((list) => replace(list, preset))}
                onAdd={(preset) => setShopList((list) => [...list, preset])}
              />
            ) : step === NOTIFICATIONS ? (
              <NotificationsStep />
            ) : (
              <DoneStep
                name={name}
                photo={photo}
                chips={[
                  `${positives} ${positives === 1 ? 'boa' : 'boas'} · ${plural(
                    chosenActivities.length - positives,
                    'ruim',
                    'ruins',
                  )}`,
                  `${plural(chosenShop.length, 'item', 'itens')} na loja`,
                  alerts.granted ? 'Notificações ativadas' : 'Notificações desligadas',
                ]}
                goal={cheapest([...chosenShop, ...existingShop])}
              />
            )}
          </ScrollView>

          <View style={styles.footer}>
            {!canContinue ? (
              <Text accessibilityLiveRegion="polite" style={styles.hint}>
                {blockedHint}
              </Text>
            ) : null}
            <Button
              label={primaryLabel}
              variant={welcome ? 'secondary' : 'primary'}
              style={welcome && styles.start}
              disabled={!canContinue}
              loading={asking}
              onPress={
                step === NOTIFICATIONS ? () => void allowAlerts() : step === DONE ? finish : next
              }
            />
            {step === NOTIFICATIONS ? (
              <Pressable accessibilityRole="button" onPress={skipAlerts} style={styles.link}>
                <Text style={styles.linkText}>Agora não</Text>
              </Pressable>
            ) : null}
            {welcome ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  void signOut().catch((error: unknown) => console.error('Falha ao sair.', error))
                }
                style={styles.link}
              >
                <Text style={[styles.linkText, !wide && styles.linkOnInk]}>
                  Entrar com outra conta
                </Text>
              </Pressable>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.paper },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.paper,
  },
  aside: {
    flex: 1,
    backgroundColor: colors.ink,
    padding: 56,
    justifyContent: 'space-between',
    gap: 40,
  },
  pitch: { gap: spacing.xxl },
  headline: {
    fontFamily: fonts.displayBold,
    fontSize: 56,
    lineHeight: 58,
    letterSpacing: -2.5,
    color: colors.white,
  },
  accent: { color: colors.accent },
  pitchText: {
    maxWidth: 460,
    fontFamily: fonts.body,
    fontSize: 18,
    lineHeight: 27,
    color: colors.onInkMuted,
  },
  column: { flex: 1, backgroundColor: colors.paper },
  dark: { backgroundColor: colors.ink },
  frame: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  back: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontFamily: fonts.body, fontSize: 24, lineHeight: 28, color: colors.ink },
  progress: { flex: 1, flexDirection: 'row', gap: spacing.xs },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.badLight },
  barOn: { backgroundColor: colors.ink },
  stepLabel: { fontFamily: fonts.mono, fontSize: fontSizes.caption, color: colors.graphite },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  scrollWelcome: { paddingTop: spacing.xl },
  welcome: { flexGrow: 1 },
  // Na web larga o texto de boas-vindas fica em um cartão escuro, ao lado do painel.
  welcomeWide: { backgroundColor: colors.ink, borderRadius: 24, paddingHorizontal: spacing.xxl },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.sm },
  start: { backgroundColor: colors.accent, borderColor: colors.accent },
  hint: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    color: colors.graphite,
  },
  link: { minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.label, color: colors.slate },
  linkOnInk: { color: colors.onInkMuted },
  error: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.label, color: colors.danger },
});
