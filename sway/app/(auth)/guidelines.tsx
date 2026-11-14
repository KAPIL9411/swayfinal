import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Button } from '../../src/components/ui';
import { OnboardingHeader } from '../../src/components/OnboardingHeader';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { authApi, ApiError } from '../../src/lib/api';
import { useOnboardingStore } from '../../src/features/auth/onboardingStore';
import { queryClient, queryKeys } from '../../src/lib/queryClient';
import { analytics, EVENTS } from '../../src/lib/analytics';

const RULES = [
  { emoji: '🎭', title: 'Keep it anonymous', text: 'Never post names, numbers or screenshots that identify someone.' },
  { emoji: '🚫', title: 'No hate, no harassment', text: 'Slurs, threats, doxxing and sexual content get you banned.' },
  { emoji: '💜', title: 'Consent is the vibe', text: 'Secret vibes stay secret until both people match.' },
  { emoji: '🆘', title: 'Look out for each other', text: 'If someone is in crisis, report it. We route them to helplines.' },
];

export default function GuidelinesScreen() {
  const router = useRouter();
  const { college, username, avatarKey, interests, lookingFor, reset } = useOnboardingStore();

  const [accepted, setAccepted] = useState(false);
  const [is18, setIs18] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = accepted && is18 && Boolean(college);

  async function handleFinish() {
    if (!college) {
      setError('Your session expired. Start again from college selection.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.createProfile({
        collegeId: college.id,
        username,
        avatarKey,
        interests,
        lookingFor,
        is18Confirmed: true,
        guidelinesAccepted: true,
      });

      analytics.track(EVENTS.SIGNUP_COMPLETED, { college: college.name, signup: 'anonymous' });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile });
      // Verification is the last step: no email, so the ID card is the proof.
      router.replace('/(auth)/verify-id');
      reset();
    } catch (err) {
      // Already onboarded (for example the app was reinstalled) - just continue
      if (err instanceof ApiError && err.status === 409) {
        reset();
        router.replace('/(tabs)/wall');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Could not create your profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer scrollable>
      <OnboardingHeader
        step={5}
        total={6}
        title="The house rules"
        subtitle="SWAY only works if everyone plays fair. This is the deal."
      />

      <View style={styles.rules}>
        {RULES.map((rule) => (
          <View key={rule.title} style={styles.rule}>
            <Text style={styles.ruleEmoji}>{rule.emoji}</Text>
            <View style={styles.ruleContent}>
              <Text style={styles.ruleTitle}>{rule.title}</Text>
              <Text style={styles.ruleText}>{rule.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <CheckRow
        checked={is18}
        onPress={() => setIs18((v) => !v)}
        label="I confirm I am 18 or older"
      />
      <CheckRow
        checked={accepted}
        onPress={() => setAccepted((v) => !v)}
        label="I accept the community guidelines and privacy policy"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button fullWidth disabled={!ready} loading={loading} onPress={handleFinish} style={styles.cta}>
        Enter SWAY
      </Button>

      <Text style={styles.footer}>
        You can delete your account and data any time from Settings.
      </Text>
    </ScreenContainer>
  );
}

function CheckRow({
  checked,
  onPress,
  label,
}: {
  checked: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <TouchableOpacity style={styles.checkRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  rules: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  rule: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.light.surfaceContainerLowest,
    borderRadius: radius.default,
    padding: spacing.md,
  },
  ruleEmoji: {
    fontSize: 22,
  },
  ruleContent: {
    flex: 1,
  },
  ruleTitle: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    fontWeight: '700',
    color: colors.light.onSurface,
  },
  ruleText: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 20,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.light.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  checkmark: {
    color: colors.light.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  checkLabel: {
    flex: 1,
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.onSurface,
  },
  error: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.error,
    marginTop: spacing.sm,
  },
  cta: {
    marginTop: spacing.lg,
  },
  footer: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: 12,
    color: colors.light.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
