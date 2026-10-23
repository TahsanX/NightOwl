import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TravelMode } from '@saferoute/shared-types';
import { theme } from '../theme';

const MODES: { id: TravelMode; label: string }[] = [
  { id: 'driving', label: 'Drive' },
  { id: 'cycling', label: 'Cycle' },
  { id: 'walking', label: 'Walk' },
];

interface Props {
  mode: TravelMode;
  onChange: (mode: TravelMode) => void;
}

/** Switching mode switches the scoring profile on the server, not just the ETA. */
export function ModeSwitcher({ mode, onChange }: Props) {
  return (
    <View style={styles.container}>
      {MODES.map((option) => (
        <Pressable
          key={option.id}
          onPress={() => onChange(option.id)}
          style={[styles.option, mode === option.id && styles.optionActive]}
          accessibilityRole="radio"
          accessibilityState={{ selected: mode === option.id }}
        >
          <Text style={[styles.label, mode === option.id && styles.labelActive]}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 4,
    gap: 4,
    alignSelf: 'flex-start',
  },
  option: {
    paddingVertical: theme.spacing(0.75),
    paddingHorizontal: theme.spacing(2),
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionActive: { borderColor: theme.colors.accent },
  label: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  labelActive: { color: theme.colors.text },
});
