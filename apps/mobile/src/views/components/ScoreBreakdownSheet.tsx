import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RouteCardView } from '@saferoute/shared-types';
import { theme } from '../theme';

interface Props {
  route: RouteCardView | null;
  visible: boolean;
  onClose: () => void;
}

/**
 * The transparency screen: every point in the score is attributable to a factor
 * the user can read. Factors the engine dropped are shown too, marked as
 * lacking data, so a missing signal never looks like a bad one.
 */
export function ScoreBreakdownSheet({ route, visible, onClose }: Props) {
  if (!route) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>A closer look at this route</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>What goes into this score</Text>
          <Text style={styles.disclaimer}>{route.score.disclaimer}</Text>
          <Text style={styles.disclaimer}>
            Based on {route.score.judgedFactorCount} of {route.score.factorCount} factors (
            {Math.round(route.score.dataCoverage * 100)}% of possible points). The rest had too
            little data in this area to judge.
          </Text>

          <ScrollView contentContainerStyle={styles.list}>
            {route.score.breakdown.map((item) => (
              <View key={item.factorId} style={styles.row}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={[styles.rowPoints, item.excluded && styles.rowPointsMuted]}>
                    {item.excluded
                      ? '— / ' + item.maxPoints + ' pts'
                      : `${item.points.toFixed(1)} / ${item.maxPoints} pts`}
                  </Text>
                </View>
                <Text style={styles.rowExplanation}>
                  {item.excluded ? item.excludedReason : item.explanation}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing(2.5),
    maxHeight: '85%',
    gap: theme.spacing(1),
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
  close: { color: theme.colors.textMuted, fontSize: 18 },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: theme.spacing(1),
  },
  disclaimer: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
  list: { gap: theme.spacing(2), paddingVertical: theme.spacing(1.5) },
  row: { gap: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 12 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing(1) },
  rowLabel: { color: theme.colors.text, fontSize: 14, flex: 1 },
  rowPoints: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  rowPointsMuted: { color: theme.colors.textMuted, fontWeight: '500' },
  rowExplanation: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
});
