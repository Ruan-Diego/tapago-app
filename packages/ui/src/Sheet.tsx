import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { MIN_TOUCH, SIDEBAR_BREAKPOINT, colors, fonts, radii, spacing } from './tokens';

export interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Formulário sobre a tela: folha que sobe no celular, caixa centralizada na web larga. */
export function Sheet({ title, onClose, children }: SheetProps) {
  const wide = useWindowDimensions().width >= SIDEBAR_BREAKPOINT;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={[styles.overlay, wide && styles.center]}>
        <View accessibilityLabel={title} style={[styles.dialog, wide && styles.dialogWide]}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                onPress={onClose}
                style={styles.close}
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,17,17,0.45)' },
  center: { justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  dialog: {
    maxHeight: '92%',
    backgroundColor: colors.paper,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
  },
  dialogWide: { width: '100%', maxWidth: 440, borderRadius: radii.xxl },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { flex: 1, fontFamily: fonts.displayBold, fontSize: 22, color: colors.ink },
  close: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 16, color: colors.ink },
});
