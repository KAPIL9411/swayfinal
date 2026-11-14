import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer, Button } from '../../src/components/ui';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { verificationApi } from '../../src/lib/api';
import { clearSession } from '../../src/lib/session';

/**
 * Shown while an admin reviews an uploaded student ID.
 * Polls every 15s so approval lands without the student doing anything.
 */
export default function PendingReviewScreen() {
  const router = useRouter();

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['verification', 'me'],
    queryFn: verificationApi.me,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (data?.status === 'approved' || data?.emailDomainVerified) {
      // Profile already exists by the time this screen is reached.
      router.replace('/(tabs)/wall');
    }
  }, [data?.status, data?.emailDomainVerified, router]);

  const rejected = data?.status === 'rejected';

  return (
    <ScreenContainer scrollable>
      <View style={styles.hero}>
        <View style={[styles.badge, rejected && styles.badgeRejected]}>
          <Ionicons
            name={rejected ? 'alert-circle-outline' : 'time-outline'}
            size={26}
            color={rejected ? colors.light.error : colors.light.primary}
          />
        </View>

        <Text style={styles.title}>{rejected ? 'We could not verify that ID' : 'ID under review'}</Text>

        <Text style={styles.body}>
          {rejected
            ? data?.note || 'The photo was not clear enough. Upload a sharper picture of your student ID.'
            : 'An admin is checking your student ID. You can browse meanwhile — posting unlocks when it is approved.'}
        </Text>
      </View>

      <View style={styles.steps}>
        <Step label="ID uploaded" state="done" />
        <Step label="Admin review" state={rejected ? 'error' : 'active'} />
        <Step label="Campus unlocked" state="idle" />
      </View>

      {rejected ? (
        <Button fullWidth onPress={() => router.replace('/(auth)/verify-id')} style={styles.cta}>
          Upload a new photo
        </Button>
      ) : (
        <Button
          fullWidth
          variant="ghost"
          loading={isFetching}
          onPress={() => refetch()}
          style={styles.cta}
        >
          Check status
        </Button>
      )}

      <TouchableOpacity
        style={styles.signOut}
        onPress={async () => {
          await clearSession();
          router.replace('/(auth)/welcome');
        }}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

function Step({ label, state }: { label: string; state: 'done' | 'active' | 'error' | 'idle' }) {
  const meta = {
    done: { icon: 'checkmark-circle', color: colors.light.primary },
    active: { icon: 'ellipse-outline', color: colors.light.onSurfaceVariant },
    error: { icon: 'close-circle', color: colors.light.error },
    idle: { icon: 'ellipse-outline', color: colors.light.outlineVariant },
  }[state] as { icon: keyof typeof Ionicons.glyphMap; color: string };

  return (
    <View style={styles.step}>
      <Ionicons name={meta.icon} size={16} color={meta.color} />
      <Text style={[styles.stepText, state === 'active' && styles.stepTextActive]}>{label}</Text>
      {state === 'active' ? <ActivityIndicator size="small" color={colors.light.primary} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.light.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRejected: {
    backgroundColor: colors.light.errorContainer,
  },
  title: {
    fontFamily: typography.headlineMd.fontFamily,
    fontSize: 24,
    fontWeight: '700',
    color: colors.light.onSurface,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  body: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodySm.fontSize,
    lineHeight: 20,
    color: colors.light.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 300,
  },
  steps: {
    marginTop: spacing.xl,
    backgroundColor: colors.light.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepText: {
    flex: 1,
    fontFamily: typography.bodySm.fontFamily,
    fontSize: 13,
    color: colors.light.onSurfaceVariant,
  },
  stepTextActive: {
    color: colors.light.onSurface,
    fontWeight: '600',
  },
  cta: {
    marginTop: spacing.lg,
  },
  signOut: {
    alignSelf: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  signOutText: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: 13,
    color: colors.light.onSurfaceVariant,
    textDecorationLine: 'underline',
  },
});
