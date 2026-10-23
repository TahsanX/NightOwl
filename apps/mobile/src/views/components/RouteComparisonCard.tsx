import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RouteCardView } from '@saferoute/shared-types';
import { scoreColor, theme } from '../theme';

/** Below this share of judged points, the card warns that the score is thin. */
const LIMITED_DATA_THRESHOLD = 0.6;

interface Props {
  route: RouteCardView;
  rank: number;
  selected: boolean;
  onPress: () => void;
  onShowBreakdown: () => void;
}

export function RouteComparisonCard({
  route,
  rank,
  selected,
  onPress,
  onShowBreakdown,
}: Props) {
  const title = route.isHighestActivity ? 'More listed activity' : 'Quickest option';

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={styles.header}>
        <Text style={styles.heading}>
          {route.isHighestActivity ? 'Higher activity route' : 'Fastest route'} · Comparison rank{' '}
          {rank}
        </Text>
        <View style={[styles.radio, selected && styles.radioSelected]} />
      </View>
      <Text style={styles.subheading}>{title}</Text>

      <View style={styles.body}>
        <View style={[styles.ring, { borderColor: scoreColor(route.score.total) }]}>
          <Text style={styles.ringValue}>{route.score.total}</Text>
          <Text style={styles.ringMax}>/ {route.score.outOf}</Text>
        </View>

        <View style={styles.facts}>
          <Text style={styles.scoreLabel}>Night Activity Score</Text>
          <Text style={styles.caption}>{route.score.caption}</Text>
          <Text style={styles.duration}>{route.durationMin} min</Text>
          <Text style={styles.caption}>
            {(route.distanceM / 1000).toFixed(1)} km ·{' '}
            {route.isFastest ? 'quickest option' : 'alternative'}
          </Text>
          <Text style={styles.caption}>
            {route.openPlaceCount} places listed as open around your passing time
          </Text>
        </View>
      </View>

      {route.score.dataCoverage < LIMITED_DATA_THRESHOLD && (
        <Text style={styles.limitedData}>
          Limited data here: only {route.score.judgedFactorCount} of {route.score.factorCount}{' '}
          factors could be judged.
        </Text>
      )}

      <Pressable onPress={onShowBreakdown} hitSlop={8}>
        <Text style={styles.link}>A closer look at this route</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing(2),
    gap: theme.spacing(1),
  },
  cardSelected: { borderColor: theme.colors.text },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
  subheading: { color: theme.colors.textMuted, fontSize: 12 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  radioSelected: { borderColor: theme.colors.text, backgroundColor: theme.colors.text },
  body: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  ring: {
    width: 88,
    height: 88,
    borderRadius: theme.radius.pill,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: { color: theme.colors.text, fontSize: 26, fontWeight: '700' },
  ringMax: { color: theme.colors.textMuted, fontSize: 12 },
  facts: { flex: 1, gap: 2 },
  scoreLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  duration: { color: theme.colors.text, fontSize: 24, fontWeight: '700', marginTop: 4 },
  caption: { color: theme.colors.textMuted, fontSize: 12 },
  link: { color: theme.colors.accent, fontSize: 13, fontWeight: '600' },
  limitedData: { color: theme.colors.scoreMid, fontSize: 12, lineHeight: 17 },
});
