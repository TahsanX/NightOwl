import React from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { PlaceSearchResult } from '@saferoute/shared-types';
import { theme } from '../theme';

interface Props {
  query: string;
  onChangeQuery: (text: string) => void;
  results: PlaceSearchResult[];
  loading: boolean;
  error: string | null;
  selected: PlaceSearchResult | null;
  onSelect: (place: PlaceSearchResult) => void;
  onClear: () => void;
}

export function DestinationSearch({
  query,
  onChangeQuery,
  results,
  loading,
  error,
  selected,
  onSelect,
  onClear,
}: Props) {
  const showResults = !selected && (results.length > 0 || !!error);

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Where to?"
          placeholderTextColor={theme.colors.textMuted}
          value={selected ? selected.name : query}
          onChangeText={(text) => {
            if (selected) onClear();
            onChangeQuery(text);
          }}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Destination"
        />
        {loading && <ActivityIndicator color={theme.colors.accent} />}
        {(query.length > 0 || selected) && !loading && (
          <Pressable onPress={onClear} hitSlop={12} accessibilityLabel="Clear destination">
            <Text style={styles.clear}>✕</Text>
          </Pressable>
        )}
      </View>

      {showResults && (
        <View style={styles.results}>
          {error && <Text style={styles.error}>{error}</Text>}
          {results.map((place) => (
            <Pressable
              key={place.id}
              style={({ pressed }) => [styles.result, pressed && styles.resultPressed]}
              onPress={() => {
                Keyboard.dismiss();
                onSelect(place);
              }}
            >
              <Text style={styles.resultName} numberOfLines={1}>
                {place.name}
              </Text>
              {!!place.address && (
                <Text style={styles.resultAddress} numberOfLines={1}>
                  {place.address}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing(0.5) },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing(1.75),
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
    paddingVertical: theme.spacing(1.5),
  },
  clear: { color: theme.colors.textMuted, fontSize: 16 },
  results: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  result: {
    paddingHorizontal: theme.spacing(1.75),
    paddingVertical: theme.spacing(1.25),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  resultPressed: { backgroundColor: theme.colors.surfaceRaised },
  resultName: { color: theme.colors.text, fontSize: 15 },
  resultAddress: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  error: { color: theme.colors.scoreLow, fontSize: 13, padding: theme.spacing(1.5) },
});
