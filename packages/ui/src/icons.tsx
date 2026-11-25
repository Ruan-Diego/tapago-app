import Svg, { Circle, Path } from 'react-native-svg';

export type IconName = 'activities' | 'shop' | 'inventory' | 'history' | 'profile';

const PATHS: Record<IconName, string[]> = {
  activities: [
    'M10 6h10M10 12h10M10 18h10',
    'M3.5 6l1.5 1.5L7.5 5',
    'M3.5 12l1.5 1.5L7.5 11',
    'M3.5 18l1.5 1.5L7.5 17',
  ],
  shop: ['M5 8h14l-1.2 12H6.2L5 8z', 'M9 8V6.5a3 3 0 0 1 6 0V8'],
  inventory: ['M4 8l8-4 8 4v8l-8 4-8-4V8z', 'M4 8l8 4 8-4M12 12v8'],
  history: ['M5 20v-8M12 20V5M19 20v-5'],
  profile: ['M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6'],
};

/** Ícones de traço da navegação, copiados do protótipo. */
export function Icon({ name, color, size = 22 }: { name: IconName; color: string; size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === 'profile' ? <Circle cx={12} cy={8} r={4} /> : null}
      {PATHS[name].map((d) => (
        <Path key={d} d={d} />
      ))}
    </Svg>
  );
}
