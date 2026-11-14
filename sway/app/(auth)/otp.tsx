import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Button } from '../../src/components/ui';
import { OnboardingHeader } from '../../src/components/OnboardingHeader';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { authApi, ApiError } from '../../src/lib/api';
import { saveSession } from '../../src/lib/session';
import { useOnboardingStore } from '../../src/features/auth/onboardingStore';
import { nextOnboardingRoute } from '../../src/lib/onboardingGate';

const RESEND_SECONDS = 45;

export default function OtpScreen() {
  const router = useRouter();
  const email = useOnboardingStore((s) => s.email);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [sending, setSending] = useState(false);
  const sentOnce = useRef(false);

  // Send the first code as soon as the screen opens
  useEffect(() => {
    if (!email) {
      router.replace('/(auth)/email');
      return;
    }
    if (!sentOnce.current) {
      sentOnce.current = true;
      sendCode();
    }
  }, [email]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  async function sendCode() {
    setSending(true);
    setError(null);
    try {
      await authApi.sendOtp(email);
      setNotice(`Code sent to ${email}`);
      setSecondsLeft(RESEND_SECONDS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the code');
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    if (code.length !== 6) {
      setError('Enter the 6 digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await authApi.verifyOtp(email, code);

      // Persist the tokens the Worker returned; the app never talks to Supabase
      await saveSession({
        accessToken: result.session.access_token,
        refreshToken: result.session.refresh_token,
        expiresAt: result.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
        userId: result.user.id,
      });

      // Profile -> app. Otherwise the gate decides between username,
      // ID review pending, or an ID upload.
      router.replace(await nextOnboardingRoute());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer scrollable>
      <OnboardingHeader
                  step={3}
          total={7}
        title="Enter your code"
        subtitle={`We sent a 6 digit code to ${email || 'your college email'}`}
        onBack={() => router.replace('/(auth)/email')}
      />

      <TextInput
        style={[styles.codeInput, error ? styles.inputError : null]}
        value={code}
        onChangeText={(text) => {
          setCode(text.replace(/[^0-9]/g, '').slice(0, 6));
          if (error) setError(null);
        }}
        keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
        placeholder="••••••"
        placeholderTextColor={colors.light.outlineVariant}
        maxLength={6}
        autoFocus
        onSubmitEditing={handleVerify}
        returnKeyType="done"
        accessibilityLabel="Verification code"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice && !error ? <Text style={styles.notice}>{notice}</Text> : null}

      <Button
        fullWidth
        loading={loading}
        disabled={code.length !== 6}
        onPress={handleVerify}
        style={styles.cta}
      >
        Verify
      </Button>

      <View style={styles.resendRow}>
        {sending ? (
          <Text style={styles.resendMuted}>Sending…</Text>
        ) : secondsLeft > 0 ? (
          <Text style={styles.resendMuted}>Resend code in {secondsLeft}s</Text>
        ) : (
          <TouchableOpacity onPress={sendCode}>
            <Text style={styles.resendAction}>Resend code</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity onPress={() => router.replace('/(auth)/email')} style={styles.changeEmail}>
        <Text style={styles.changeEmailText}>Wrong email? Change it</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  codeInput: {
    height: 72,
    borderRadius: radius.default,
    backgroundColor: colors.light.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: colors.light.outlineVariant,
    textAlign: 'center',
    fontFamily: typography.headlineMd.fontFamily,
    fontSize: 32,
    letterSpacing: 12,
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
    textAlign: 'center',
  },
  notice: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  cta: {
    marginTop: spacing.lg,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  resendMuted: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.onSurfaceVariant,
  },
  resendAction: {
    fontFamily: typography.labelMd.fontFamily,
    fontSize: typography.labelMd.fontSize,
    color: colors.light.primary,
    letterSpacing: typography.labelMd.letterSpacing,
  },
  changeEmail: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  changeEmailText: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.onSurfaceVariant,
    textDecorationLine: 'underline',
  },
});
