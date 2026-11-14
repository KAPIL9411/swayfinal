import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Button } from '../../src/components/ui';
import { OnboardingHeader } from '../../src/components/OnboardingHeader';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { AVATARS } from '../../src/theme/interests';
import { useOnboardingStore } from '../../src/features/auth/onboardingStore';

export default function AvatarScreen() {
  const router = useRouter();
  const storeAvatar = useOnboardingStore((s) => s.avatarKey);
  const setAvatarKey = useOnboardingStore((s) => s.setAvatarKey);
  const [selected, setSelected] = useState<string>(storeAvatar || 'otter');

  function handleContinue() {
    setAvatarKey(selected);
    router.push('/(auth)/interests');
  }

  return (
    <ScreenContainer scrollable>
      <OnboardingHeader
        step={3}
        total={6}
        title="Choose your look"
        subtitle="Illustrated avatars only. Less appearance bias, more personality."
      />

      <View style={styles.grid}>
        {AVATARS.map((avatar) => {
          const isSelected = selected === avatar.key;
          return (
            <TouchableOpacity
              key={avatar.key}
              style={[styles.cell, isSelected && styles.cellSelected]}
              onPress={() => setSelected(avatar.key)}
              activeOpacity={0.7}
              accessibilityLabel={avatar.label}
            >
              <Text style={styles.emoji}>{avatar.emoji}</Text>
              <Text style={[styles.label, isSelected && styles.labelSelected]}>{avatar.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Button fullWidth onPress={handleContinue} style={styles.cta}>
        Continue
      </Button>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cell: {
    width: '31%',
    aspectRatio: 0.95,
    borderRadius: radius.lg,
    backgroundColor: colors.light.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  cellSelected: {
    borderColor: colors.light.primary,
    backgroundColor: colors.light.primaryFixed,
  },
  emoji: {
    fontSize: 36,
  },
  label: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: typography.labelSm.fontSize,
    color: colors.light.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: typography.labelSm.letterSpacing,
  },
  labelSelected: {
    color: colors.light.primary,
  },
  cta: {
    marginTop: spacing.lg,
  },
});
