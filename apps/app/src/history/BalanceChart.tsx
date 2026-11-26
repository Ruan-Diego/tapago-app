import { formatMoney, linePoints, type BalanceSeries } from '@tapago/core';
import { colors, fonts } from '@tapago/ui';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Block } from './Block';
import { shortDate } from './format';

/** Saldo no fim de cada dia do período (HIST-04). */
export function BalanceChart({ series, height }: { series: BalanceSeries; height: number }) {
  const [width, setWidth] = useState(0);
  const { start, points } = series;
  const end = points[points.length - 1]?.balance ?? start;
  const delta = end - start;
  const line = linePoints(
    points.map((point) => point.balance),
    width,
    height,
  );
  const path = line.map(({ x, y }, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  const last = line[line.length - 1];

  return (
    <Block title="Saldo" note={`${delta >= 0 ? '+' : ''}${formatMoney(delta)} no período`}>
      <Text style={styles.value}>{formatMoney(end)}</Text>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Saldo foi de ${formatMoney(start)} para ${formatMoney(end)} nos últimos ${points.length} dias`}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{ height }}
      >
        {width > 0 && last ? (
          <Svg width={width} height={height}>
            <Path
              d={`${path.join(' ')} L${width} ${height} L0 ${height} Z`}
              fill={colors.accent}
              fillOpacity={0.6}
            />
            <Path
              d={path.join(' ')}
              fill="none"
              stroke={colors.ink}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            <Circle cx={Math.min(last.x, width - 3)} cy={last.y} r={3} fill={colors.ink} />
          </Svg>
        ) : null}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisText}>{points[0] ? shortDate(points[0].date) : ''}</Text>
        <Text style={styles.axisText}>hoje</Text>
      </View>
    </Block>
  );
}

const styles = StyleSheet.create({
  value: {
    marginTop: 6,
    marginBottom: 10,
    fontFamily: fonts.displayBold,
    fontSize: 30,
    letterSpacing: -1,
    color: colors.ink,
  },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  axisText: { fontFamily: fonts.body, fontSize: 11, color: colors.graphite },
});
