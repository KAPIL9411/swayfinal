import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Button } from '../../src/components/ui';
import { OnboardingHeader } from '../../src/components/OnboardingHeader';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { authApi, ApiError } from '../../src/lib/api';
import { useOnboardingStore } from '../../src/features/auth/onboardingStore';
import { emailSchema } from '../../src/lib/zodSchemas';

export default function EmailScreen() {
  const router = useRouter();
  const college = useOnboardingStore((s) => s.college);
  const setCollege = useOnboardingStore((s) => s.setCollege);
  const storeEmail = useOnboardingStore((s) => s.email);
  const setEmail = useOnboardingStore((s) => s.setEmail);

  const [email, setEmailValue] = useState(storeEmail);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    const value = email.trim().toLowerCase();
    setError(null);

    const parsed = emailSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.verifyEmail(value);
      setEmail(value);
      // Trust the server's domain mapping over the college picked by hand.
      // No mapping means the student verifies with an ID card after signing in.
      if (result.college && (!college || college.id !== result.college.id)) {
        setCollege(result.college);
      }
      router.push('/(auth)/otp');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not verify that email right now';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer scrollable>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <OnboardingHeader
          step={2}
          total={7}
          title="Your college email"
          subtitle={
            college
              ? `${college.name} · we only use this to verify you are a student`
              : 'We only use this to verify you are a student'
          }
        />

        <Text style={styles.label}>COLLEGE EMAIL</Text>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          value={email}
          onChangeText={(text) => {
            setEmailValue(text);
            if (error) setError(null);
          }}
          placeholder="you@college.edu"
          placeholderTextColor={colors.light.onSurfaceVariant}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoFocus
          onSubmitEditing={handleContinue}
          returnKeyType="go"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.note}>
          <Text style={styles.noteIcon}>🔒</Text>
          <Text style={styles.noteText}>
            Your email is never shown to other students. Ever.
          </Text>
        </View>

        <Button fullWidth loading={loading} disabled={!email.trim()} onPress={handleContinue}>
          Send code
        </Button>

        <Text style={styles.footnote}>
          Any email works. If your college email isn&apos;t recognised, you can verify with your
          student ID card instead.
        </Text>
      </KeyboardAvoidingView>
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
  input: {
    height: 56,
    borderRadius: radius.default,
    backgroundColor: colors.light.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: colors.light.outlineVariant,
    paddingHorizontal: spacing.md,
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyLg.fontSize,
    color: colors.light.onSurface,
  },
  inputError: {
    borderColor: colors.light.error,
  },
  error: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.error,
    marginTop: spacing.sm,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.light.surfaceContainerLow,
    borderRadius: radius.default,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  noteIcon: {
    fontSize: 18,
  },
  noteText: {
    flex: 1,
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.onSurfaceVariant,
  },
  footnote: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
