import { showDialog } from '../../src/lib/dialog';
import React from 'react';
import {
  Text,
  StyleSheet,
  View,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,

} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, Avatar, Button } from '../../src/components/ui';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { authApi, collegesApi, type LookingFor } from '../../src/lib/api';
import { queryKeys } from '../../src/lib/queryClient';
import { clearSession } from '../../src/lib/session';
import { analytics, EVENTS } from '../../src/lib/analytics';

const LOOKING_FOR: LookingFor[] = ['friends', 'dating', 'both'];

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: queryKeys.auth.profile,
    queryFn: authApi.me,
  });

  const collegeId = profileQuery.data?.profile?.college_id;

  const collegeQuery = useQuery({
    queryKey: [...queryKeys.colleges.all, collegeId],
    queryFn: () => collegesApi.getById(collegeId as string),
    enabled: Boolean(collegeId),
  });

  const updateMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: ({ profile }) => {
      queryClient.setQueryData(queryKeys.auth.profile, { profile });
    },
    onError: (err: Error) => showDialog('Could not save', err.message),
  });

  const profile = profileQuery.data?.profile;
  const college = collegeQuery.data?.college;

  async function handleSignOut() {
    analytics.track(EVENTS.SIGNOUT);
    // Best effort revocation; local tokens are cleared either way
    await authApi.signOut().catch(() => undefined);
    await clearSession();
    queryClient.clear();
    router.replace('/(auth)/welcome');
  }

  function confirmSignOut() {
    showDialog(
      'Sign out',
      'This is an anonymous account - once you sign out you cannot get back into it. Your posts stay here, but the next visit starts fresh.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: handleSignOut },
      ]
    );
  }

  if (profileQuery.isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.light.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {(profileQuery.error as Error)?.message ?? 'Your profile could not load.'}
          </Text>
          <Button size="sm" onPress={() => profileQuery.refetch()} style={styles.retry}>
            Retry
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padding={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>YOU</Text>

        <View style={styles.identity}>
          <Avatar avatarKey={profile.avatar_key} size="xl" />
          <Text style={styles.username}>@{profile.username}</Text>
          <Text style={styles.college}>{college?.name ?? 'Your college'}</Text>
          <Text style={styles.meta}>
            {[profile.year_of_study ? `Year ${profile.year_of_study}` : null, profile.branch]
              .filter(Boolean)
              .join(' · ') || 'Add your year and branch'}
          </Text>
        </View>

        <View style={styles.interests}>
          {profile.interests.map((interest) => (
            <View key={interest} style={styles.interest}>
              <Text style={styles.interestText}>{interest}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DISCOVERY</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingBody}>
              <Text style={styles.settingTitle}>Show me in Discover</Text>
              <Text style={styles.settingDescription}>
                Off means no one can find you or send you vibes.
              </Text>
            </View>
            <Switch
              value={profile.is_discoverable}
              onValueChange={(value) => updateMutation.mutate({ isDiscoverable: value })}
              trackColor={{ true: colors.light.primary, false: colors.light.surfaceContainerHighest }}
              thumbColor={colors.light.surfaceContainerLowest}
            />
          </View>

          <Text style={styles.settingLabel}>LOOKING FOR</Text>
          <View style={styles.segmented}>
            {LOOKING_FOR.map((option) => {
              const active = profile.looking_for === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.segment, active && styles.segmentActive]}
                  onPress={() => updateMutation.mutate({ lookingFor: option })}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          {profile.is_admin ? (
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => router.push('/admin/reviews')}
            >
              <Text style={styles.adminText}>ID review queue</Text>
              <Text style={styles.linkArrow}>→</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.linkRow} onPress={confirmSignOut}>
            <Text style={styles.linkText}>Sign out</Text>
            <Text style={styles.linkArrow}>→</Text>
          </TouchableOpacity>
          <View style={styles.linkRow}>
            <Text style={styles.mutedText}>Privacy, guidelines & grievance officer</Text>
          </View>
        </View>

        <Text style={styles.version}>SWAY 1.0.0 · Campus edition</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.marginMobile,
    paddingBottom: spacing['2xl'],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    color: colors.light.onSurfaceVariant,
    textAlign: 'center',
  },
  retry: { marginTop: spacing.md },
  kicker: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.light.onSurfaceVariant,
  },
  identity: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  username: {
    fontFamily: typography.headlineLg.fontFamily,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.light.onSurface,
    marginTop: spacing.sm,
  },
  college: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.onSurfaceVariant,
    marginTop: 2,
  },
  meta: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    color: colors.light.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  interests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  interest: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.light.surfaceContainerLow,
  },
  interestText: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 10,
    color: colors.light.onSurfaceVariant,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: typography.labelSm.fontSize,
    letterSpacing: typography.labelSm.letterSpacing,
    color: colors.light.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.light.surfaceContainerLowest,
    borderRadius: radius.default,
    padding: spacing.md,
  },
  settingBody: { flex: 1 },
  settingTitle: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    fontWeight: '600',
    color: colors.light.onSurface,
  },
  settingDescription: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: 12,
    color: colors.light.onSurfaceVariant,
    marginTop: 2,
  },
  settingLabel: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.light.onSurfaceVariant,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  segmented: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.default,
    backgroundColor: colors.light.surfaceContainerLowest,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.light.secondaryContainer,
  },
  segmentText: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    textTransform: 'uppercase',
    color: colors.light.onSurfaceVariant,
  },
  segmentTextActive: {
    color: colors.light.onSecondaryContainer,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.outlineVariant,
  },
  linkText: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    color: colors.light.error,
  },
  adminText: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    color: colors.light.onSurface,
  },
  mutedText: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.onSurfaceVariant,
  },
  linkArrow: {
    fontSize: 16,
    color: colors.light.onSurfaceVariant,
  },
  version: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 10,
    color: colors.light.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
