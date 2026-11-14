import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Button, Chip } from '../../src/components/ui';
import { OnboardingHeader } from '../../src/components/OnboardingHeader';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { INTERESTS } from '../../src/theme/interests';
import { useOnboardingStore, type LookingFor } from '../../src/features/auth/onboardingStore';

const LOOKING_FOR: { key: LookingFor; label: string; description: string }[] = [
  { key: 'friends', label: 'Friends', description: 'Hang out, study, vibe' },
  { key: 'dating', label: 'Dating', description: 'Open to something more' },
  { key: 'both', label: 'Both', description: 'Whatever clicks' },
];

export default function InterestsScreen() {
  const router = useRouter();
  const storeInterests = useOnboardingStore((s) => s.interests);
  const storeLookingFor = useOnboardingStore((s) => s.lookingFor);
  const setInterests = useOnboardingStore((s) => s.setInterests);
  const setLookingFor = useOnboardingStore((s) => s.setLookingFor);

  const [selected, setSelected] = useState<string[]>(storeInterests);
  const [lookingFor, setLookingForValue] = useState<LookingFor>(storeLookingFor);

  function toggle(interest: string) {
    setSelected((current) => {
      if (current.includes(interest)) return current.filter((i) => i !== interest);
      if (current.length >= 10) return current;
      return [...current, interest];
    });
  }

  function handleContinue() {
    setInterests(selected);
    setLookingFor(lookingFor);
    router.push('/(auth)/guidelines');
  }

  const canContinue = selected.length >= 3 && selected.length <= 10;

  return (
    <ScreenContainer scrollable>
      <OnboardingHeader
        step={4}
        total={6}
        title="What's your vibe?"
        subtitle="Pick 3-10 interests. These power discovery and shared-interest matching."
      />

      <View style={styles.countRow}>
        <Text style={styles.sectionLabel}>INTERESTS</Text>
        <Text style={[styles.count, selected.length >= 3 && styles.countReady]}>
          {selected.length}/10
        </Text>
      </View>

      <View style={styles.chips}>
        {INTERESTS.map((interest) => (
          <Chip
            key={interest}
            label={interest}
            selected={selected.includes(interest)}
            onPress={() => toggle(interest)}
          />
        ))}
      </View>

      <Text style={[styles.sectionLabel, styles.lookingForLabel]}>LOOKING FOR</Text>
      <View style={styles.lookingForRow}>
        {LOOKING_FOR.map((option) => {
          const isSelected = lookingFor === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => setLookingForValue(option.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                {option.label}
              </Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Button fullWidth disabled={!canContinue} onPress={handleContinue} style={styles.cta}>
        Continue
      </Button>
      {!canContinue ? <Text style={styles.hint}>Select at least 3 interests</Text> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: typography.labelSm.fontSize,
    letterSpacing: typography.labelSm.letterSpacing,
    color: colors.light.onSurfaceVariant,
  },
  count: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: typography.labelSm.fontSize,
    color: colors.light.onSurfaceVariant,
  },
  countReady: {
    color: colors.light.secondary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  lookingForLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  lookingForRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    borderRadius: radius.default,
    backgroundColor: colors.light.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: spacing.md,
    minHeight: 88,
  },
  optionSelected: {
    borderColor: colors.light.primary,
    backgroundColor: colors.light.primaryFixed,
  },
  optionTitle: {
    fontFamily: typography.headlineSm.fontFamily,
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.onSurface,
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: colors.light.primary,
  },
  optionDescription: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: 12,
    color: colors.light.onSurfaceVariant,
  },
  cta: {
    marginTop: spacing.xl,
  },
  hint: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
