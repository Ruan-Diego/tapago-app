import { Appear, Button, colors, fonts, fontSizes, spacing } from '@tapago/ui';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Receipt } from './receipt';

interface ReceiptModalProps {
  receipt: Receipt;
  onClose: () => void;
  onSeeTimer: () => void;
}

export function ReceiptModal({ receipt, onClose, onSeeTimer }: ReceiptModalProps) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Appear style={styles.slot}>
          <View accessibilityLabel="Recibo" style={styles.paper}>
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.row}>
                <Text style={styles.head}>RECIBO Nº {receipt.number}</Text>
                <Text style={styles.head}>{receipt.when}</Text>
              </View>
              <Text accessibilityRole="header" style={styles.title}>
                <Text style={styles.highlight}> Tá pago. </Text>
              </Text>
              <View style={styles.divider} />
              {receipt.rows.map(([label, value]) => (
                <View key={label} style={styles.row}>
                  <Text style={styles.label}>{label}</Text>
                  <Text style={styles.value}>{value}</Text>
                </View>
              ))}
              <View style={styles.divider} />
              <Text style={styles.note}>
                Se alguém perguntar por que você tá nessa agora, a resposta é simples: tá pago. Você
                trabalhou por isso.
              </Text>
              <Button
                label={receipt.running ? 'Ver timer' : 'Fechar'}
                onPress={receipt.running ? onSeeTimer : onClose}
                style={styles.button}
              />
            </ScrollView>
          </View>
        </Appear>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: 'rgba(17,17,17,0.6)',
  },
  slot: { width: '100%', maxWidth: 380, maxHeight: '100%' },
  paper: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '100%',
    borderRadius: 6,
    backgroundColor: colors.white,
  },
  content: { padding: spacing.xl, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  head: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, color: colors.graphite },
  title: { fontFamily: fonts.displayBold, fontSize: 46, letterSpacing: -2, color: colors.ink },
  highlight: { backgroundColor: colors.accent, color: colors.onAccent },
  divider: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.graphite },
  label: { fontFamily: fonts.mono, fontSize: fontSizes.small, color: colors.graphite },
  value: {
    flex: 1,
    textAlign: 'right',
    fontFamily: fonts.monoSemiBold,
    fontSize: fontSizes.small,
    color: colors.ink,
  },
  note: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 18, color: colors.slate },
  button: { marginTop: spacing.sm },
});
