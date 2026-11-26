import { formatMoney } from '@tapago/core';
import { Card, colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StepTitle } from './StepTitle';

function Step({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <Card>
      <View style={styles.head}>
        <Text style={styles.number}>{number}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {children}
    </Card>
  );
}

function Example({ name, price, negative }: { name: string; price: string; negative?: boolean }) {
  return (
    <View style={[styles.example, negative && styles.negative]}>
      <Text style={styles.exampleName}>{name}</Text>
      <View style={[styles.price, negative && styles.priceNegative]}>
        <Text style={[styles.priceText, negative && styles.priceTextNegative]}>{price}</Text>
      </View>
    </View>
  );
}

/** "Como funciona" (ONB-01): +, − e loja. */
export function HowItWorks() {
  return (
    <>
      <StepTitle title="Como funciona">Três passos. Você define todas as regras.</StepTitle>
      <View style={styles.list}>
        <Step number="01" title="Cadastre atividades e dê um preço">
          <Example name="Lavar a pia" price={`+${formatMoney(1000)}`} />
          <Example name="Reels demais" price={formatMoney(-800)} negative />
          <Text style={styles.text}>
            As boas dão dinheiro. As ruins — Reels demais, gritar com alguém — tiram.
          </Text>
        </Step>
        <Step number="02" title="Fez? Toque e o saldo muda na hora">
          <View style={styles.balance}>
            <Text style={styles.before}>{formatMoney(0)}</Text>
            <Text style={styles.arrow}>→</Text>
            <Text style={styles.after}>{formatMoney(1000)}</Text>
          </View>
        </Step>
        <Step number="03" title="Compre seu lazer na loja">
          <View style={styles.receipt}>
            <Text style={styles.receiptText}>Jogar 1 hora · {formatMoney(1800)}</Text>
            <Text style={styles.paid}>Tá pago.</Text>
          </View>
          <Text style={styles.text}>
            Use na hora — o timer começa e te avisamos quando acabar — ou guarde no inventário pra
            depois.
          </Text>
        </Step>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  number: { fontFamily: fonts.mono, fontSize: fontSizes.caption, color: colors.graphite },
  title: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.ink },
  text: {
    marginTop: 10,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    lineHeight: 19,
    color: colors.graphite,
  },
  example: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingLeft: 14,
    paddingRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  negative: { borderStyle: 'dashed', borderColor: colors.leisure },
  exampleName: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.ink },
  price: {
    backgroundColor: colors.surfaceInk,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radii.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  priceNegative: { backgroundColor: colors.white },
  priceText: { fontFamily: fonts.display, fontSize: fontSizes.label, color: colors.onSurfaceInk },
  priceTextNegative: { color: colors.ink },
  balance: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  before: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.graphite },
  arrow: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.ink },
  after: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.onAccent,
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
  },
  receipt: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.leisure,
    borderRadius: 6,
  },
  receiptText: { fontFamily: fonts.mono, fontSize: fontSizes.caption, color: colors.ink },
  paid: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.onAccent,
    backgroundColor: colors.accent,
    paddingHorizontal: 4,
  },
});
