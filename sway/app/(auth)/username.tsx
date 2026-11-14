import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Button } from '../../src/components/ui';
import { OnboardingHeader } from '../../src/components/OnboardingHeader';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { authApi } from '../../src/lib/api';
import { useOnboardingStore } from '../../src/features/auth/onboardingStore';
import { usernameSchema } from '../../src/lib/zodSchemas';

type Status = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function UsernameScreen() {
  const router = useRouter();
  const storeUsername = useOnboardingStore((s) => s.username);
  const setUsername = useOnboardingStore((s) => s.setUsername);

  const [value, setValue] = useState(storeUsername);
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    const username = value.trim().toLowerCase();
    if (!username) {
      setStatus('idle');
      return;
    }

    if (!usernameSchema.safeParse(username).success) {
      setStatus('invalid');
      return;
    }

    setStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const result = await authApi.checkUsername(username);
        setStatus(result.available ? 'available' : 'taken');
      } catch {
        setStatus('idle');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [value]);

  function handleContinue() {
    const username = value.trim().toLowerCase();
    if (!usernameSchema.safeParse(username).success) return;
    setUsername(username);
    router.push('/(auth)/avatar');
  }

  const helper =
    status === 'invalid'
      ? '3-20 characters. lowercase letters, numbers, dots and underscores only.'
      : status === 'taken'
        ? 'That one is taken. Try another.'
        : status === 'available'
          ? 'Available — nice.'
          : 'This is how other students will see you.';

  return (
    <ScreenContainer scrollable>
      <OnboardingHeader
        step={2}
        total={6}
        title="Pick a username"
        subtitle="Anonymous to the campus, known by your handle."
      />

      <Text style={styles.label}>USERNAME</Text>
      <View
        style={[
          styles.inputWrapper,
          status === 'available' && styles.inputValid,
          (status === 'taken' || status === 'invalid') && styles.inputInvalid,
        ]}
      >
        <Text style={styles.prefix}>@</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => setValue(text.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, 20))}
          placeholder="campusghost"
          placeholderTextColor={colors.light.onSurfaceVariant}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          onSubmitEditing={handleContinue}
          returnKeyType="go"
        />
        {status === 'checking' ? <Text style={styles.status}>…</Text> : null}
        {status === 'available' ? <Text style={styles.statusValid}>✓</Text> : null}
      </View>

      <Text
        style={[
          styles.helper,
          status === 'taken' || status === 'invalid' ? styles.helperError : null,
          status === 'available' ? styles.helperValid : null,
        ]}
      >
        {helper}
      </Text>

      <Button
        fullWidth
        onPress={handleContinue}
        disabled={status !== 'available'}
        style={styles.cta}
      >
        Continue
      </Button>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: typography.labelSm.fontSize,
    letterSpacing: typography.labelSm.letterSpacing,
    color: colors.light.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: radius.default,
    backgroundColor: colors.light.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: colors.light.outlineVariant,
    paddingHorizontal: spacing.md,
  },
  inputValid: {
    borderColor: colors.light.secondary,
  },
  inputInvalid: {
    borderColor: colors.light.error,
  },
  prefix: {
    fontFamily: typography.bodyLg.fontFamily,
    fontSize: typography.bodyLg.fontSize,
    color: colors.light.onSurfaceVariant,
    marginRight: 2,
  },
  input: {
    flex: 1,
    fontFamily: typography.bodyLg.fontFamily,
    fontSize: typography.bodyLg.fontSize,
    color: colors.light.onSurface,
  },
  status: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: 18,
    color: colors.light.onSurfaceVariant,
  },
  statusValid: {
    fontSize: 18,
    color: colors.light.secondary,
    fontWeight: '700',
  },
  helper: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.onSurfaceVariant,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  helperError: {
    color: colors.light.error,
  },
  helperValid: {
    color: colors.light.secondary,
  },
  cta: {
    marginTop: spacing.xl,
  },
});
