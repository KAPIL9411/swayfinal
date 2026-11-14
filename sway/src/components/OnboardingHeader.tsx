import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '../theme/tokens';

interface OnboardingHeaderProps {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

/** Shared header for the onboarding steps: back, progress, title. */
export function OnboardingHeader({ step, total, title, subtitle, onBack }: OnboardingHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={onBack ?? (() => router.back())}
          hitSlop={12}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <Text style={styles.stepLabel}>
          STEP {step} / {total}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(step / total) * 100}%` }]} />
      </View>

      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.surfaceContainerLow,
  },
  backIcon: {
    fontSize: 20,
    color: colors.light.onSurface,
  },
  stepLabel: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: typography.labelSm.fontSize,
    letterSpacing: typography.labelSm.letterSpacing,
    color: colors.light.onSurfaceVariant,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.light.surfaceContainerHighest,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.light.primary,
  },
  title: {
    fontFamily: typography.headlineLgMobile.fontFamily,
    fontSize: typography.headlineLgMobile.fontSize,
    fontWeight: '800',
    color: colors.light.onSurface,
    marginTop: spacing.lg,
  },
  subtitle: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    color: colors.light.onSurfaceVariant,
    marginTop: spacing.xs,
  },
});
