import { Card, colors, fonts, fontSizes, spacing } from '@tapago/ui';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

interface BlockProps {
  title: string;
  /** À direita do título. */
  note?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** Cartão de um bloco do Histórico. */
export function Block({ title, note, style, children }: BlockProps) {
  return (
    <Card style={style}>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.ink },
  note: { fontFamily: fonts.body, fontSize: fontSizes.caption, color: colors.graphite },
});
