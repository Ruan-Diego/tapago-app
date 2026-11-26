import type { HeatCell } from '@tapago/core';
import { colors, fonts, radii, spacing } from '@tapago/ui';
import { StyleSheet, Text, View } from 'react-native';

import { Block } from './Block';
import { plural, shortDate } from './format';

const WEEKDAYS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

interface ConsistencyProps {
  weeks: HeatCell[][];
  today: string;
  /** Sequência atual e maior sequência, em dias. */
  streak: number;
  record: number;
  /** Dias sem atividade negativa no período. */
  cleanDays: number;
}

/** Mapa de constância de 13 semanas (HIST-06). */
export function Consistency({ weeks, today, streak, record, cleanDays }: ConsistencyProps) {
  const activeDays = weeks.flat().filter((cell) => cell.count > 0).length;
  const stats = [
    { label: 'Sequência', value: plural(streak, 'dia', 'dias') },
    { label: 'Recorde', value: plural(record, 'dia', 'dias') },
    { label: 'Dias limpos', value: plural(cleanDays, 'dia', 'dias') },
  ];

  return (
    <Block title="Constância" note={`atividades boas por dia · ${weeks.length} semanas`}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${plural(activeDays, 'dia', 'dias')} com atividades boas nas últimas ${weeks.length} semanas`}
        style={styles.map}
      >
        <View style={styles.weekdays}>
          {WEEKDAYS.map((letter, index) => (
            <View key={index} style={styles.weekday}>
              <Text style={styles.weekdayText}>{letter}</Text>
            </View>
          ))}
        </View>
        {weeks.map((week) => (
          <View key={week[0]?.date} style={styles.column}>
            {week.map((cell) => (
              <View
                key={cell.date}
                // Na web aparece como dica ao passar o mouse.
                {...{
                  title: cell.future
                    ? undefined
                    : `${shortDate(cell.date)} · ${plural(cell.count, 'atividade boa', 'atividades boas')}`,
                }}
                style={[
                  styles.cell,
                  !cell.future && { backgroundColor: colors.heat[cell.level] },
                  cell.date === today && styles.today,
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.scale}>
        <Text style={styles.scaleText}>menos</Text>
        {colors.heat.map((color) => (
          <View key={color} style={[styles.swatch, { backgroundColor: color }]} />
        ))}
        <Text style={styles.scaleText}>mais</Text>
      </View>
      <View style={styles.stats}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
          </View>
        ))}
      </View>
    </Block>
  );
}

const styles = StyleSheet.create({
  map: { flexDirection: 'row', gap: 4, marginTop: 14, maxWidth: 360 },
  weekdays: { gap: 4, marginRight: 2 },
  weekday: { flex: 1, justifyContent: 'center' },
  weekdayText: { fontFamily: fonts.body, fontSize: 10, color: colors.graphite },
  column: { flex: 1, gap: 4 },
  cell: { width: '100%', aspectRatio: 1, borderRadius: 4 },
  today: { borderWidth: 2, borderColor: colors.accent },
  scale: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.md },
  scaleText: { fontFamily: fonts.body, fontSize: 11, color: colors.graphite },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: 14 },
  stat: {
    flex: 1,
    minWidth: 0,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
  },
  statLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.graphite,
  },
  statValue: { marginTop: 4, fontFamily: fonts.displayBold, fontSize: 20, color: colors.ink },
});
