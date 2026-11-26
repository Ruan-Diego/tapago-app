import { formatDuration, type WeekHours } from '@tapago/core';
import { Stripes, colors, fonts, fontSizes, spacing } from '@tapago/ui';
import { StyleSheet, Text, View } from 'react-native';

import { Block } from './Block';
import { shortDate } from './format';

const BAR_HEIGHT = 112;

/** Altura de uma barra: quem teve algum tempo sempre aparece. */
const barHeight = (minutes: number, max: number) =>
  minutes <= 0 ? 0 : Math.max(3, Math.round((minutes / max) * BAR_HEIGHT));

const describe = ({ posMin, leisureMin, negMin }: WeekHours) =>
  `${formatDuration(posMin)} de bom, ${formatDuration(leisureMin)} de lazer e ${formatDuration(negMin)} de ruim`;

/** Horas por semana, três barras cada (HIST-05). */
export function WeeklyHours({ weeks }: { weeks: WeekHours[] }) {
  const max = Math.max(1, ...weeks.flatMap((w) => [w.posMin, w.leisureMin, w.negMin]));
  const current = weeks[weeks.length - 1];

  return (
    <Block title="Horas por semana" note={`últimas ${weeks.length} semanas`}>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, styles.good]} />
          <Text style={styles.legendText}>Bom</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, styles.leisure]} />
          <Text style={styles.legendText}>Lazer</Text>
        </View>
        <View style={styles.legendItem}>
          <Stripes style={styles.swatch} />
          <Text style={styles.legendText}>Ruim</Text>
        </View>
        <Text style={styles.max}>máx. {formatDuration(max)}</Text>
      </View>
      <View style={styles.chart}>
        {weeks.map((week, index) => {
          const isCurrent = index === weeks.length - 1;
          return (
            <View
              key={week.from}
              accessible
              accessibilityLabel={`Semana de ${shortDate(week.from)}: ${describe(week)}`}
              style={styles.week}
            >
              <View style={styles.bars}>
                <View style={[styles.bar, styles.good, { height: barHeight(week.posMin, max) }]} />
                <View
                  style={[styles.bar, styles.leisure, { height: barHeight(week.leisureMin, max) }]}
                />
                <Stripes style={[styles.bar, { height: barHeight(week.negMin, max) }]} />
              </View>
              <Text style={[styles.label, isCurrent && styles.labelCurrent]}>
                {isCurrent ? 'esta' : shortDate(week.from)}
              </Text>
            </View>
          );
        })}
      </View>
      {current ? <Text style={styles.sentence}>Esta semana: {describe(current)}.</Text> : null}
    </Block>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontFamily: fonts.body, fontSize: fontSizes.caption, color: colors.slate },
  max: {
    marginLeft: 'auto',
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    color: colors.graphite,
  },
  good: { backgroundColor: colors.ink },
  leisure: { backgroundColor: colors.leisure },
  chart: { flexDirection: 'row', marginTop: 14 },
  week: { flex: 1, alignItems: 'center' },
  bars: {
    alignSelf: 'stretch',
    height: BAR_HEIGHT + 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bar: { width: 8, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  label: { marginTop: 6, fontFamily: fonts.body, fontSize: 10, color: colors.graphite },
  labelCurrent: { fontFamily: fonts.bodyBold, color: colors.ink },
  sentence: {
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    color: colors.slate,
  },
});
