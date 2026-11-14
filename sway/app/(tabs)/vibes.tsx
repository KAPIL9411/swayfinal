import { showDialog } from '../../src/lib/dialog';
import React from 'react';
import {
  Text,
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,

} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, EmptyState } from '../../src/components/ui';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { vibesApi } from '../../src/lib/api';
import { queryKeys } from '../../src/lib/queryClient';
import { timeAgo } from '../../src/theme/interests';

const STATUS_COPY: Record<string, string> = {
  pending: 'Waiting for a vibe back',
  matched: 'Matched — check your chats',
  expired: 'Expired',
  withdrawn: 'Withdrawn',
};

export default function VibesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const countQuery = useQuery({
    queryKey: queryKeys.vibes.count,
    queryFn: vibesApi.getCount,
    refetchInterval: 60_000,
  });

  const sentQuery = useQuery({
    queryKey: queryKeys.vibes.sent,
    queryFn: vibesApi.getSent,
  });

  const withdrawMutation = useMutation({
    mutationFn: (targetId: string) => vibesApi.withdraw(targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vibes.sent });
      queryClient.invalidateQueries({ queryKey: queryKeys.discover.profiles() });
    },
    onError: (err: Error) => showDialog('Could not withdraw', err.message),
  });

  const count = countQuery.data?.count ?? 0;
  const sent = sentQuery.data?.vibes ?? [];

  return (
    <ScreenContainer padding={false}>
      <View style={styles.header}>
        <Text style={styles.kicker}>SECRET VIBES</Text>
        <Text style={styles.title}>Vibes</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroNumber}>{countQuery.isLoading ? '–' : count}</Text>
        <Text style={styles.heroLabel}>
          {count === 1 ? 'person vibed you' : 'people vibed you'}
        </Text>
        <Text style={styles.heroNote}>
          We'll never tell you who. If you vibe them back, it unlocks as a match.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>VIBES YOU SENT</Text>

      {sentQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.light.primary} />
        </View>
      ) : (
        <FlatList
          data={sent}
          keyExtractor={(item) => item.receiver_id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={sentQuery.isRefetching}
              onRefresh={() => {
                countQuery.refetch();
                sentQuery.refetch();
              }}
              tintColor={colors.light.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.vibeRow}>
              <View style={styles.vibeIcon}>
                <Text style={styles.vibeEmoji}>❤️</Text>
              </View>
              <View style={styles.vibeBody}>
                <Text style={styles.vibeStatus}>{STATUS_COPY[item.status] ?? item.status}</Text>
                <Text style={styles.vibeTime}>Sent {timeAgo(item.created_at)} ago</Text>
              </View>
              {item.status === 'pending' ? (
                <Text
                  style={styles.withdraw}
                  onPress={() =>
                    showDialog('Withdraw vibe', 'Take this secret vibe back?', [
                      { text: 'Keep it', style: 'cancel' },
                      {
                        text: 'Withdraw',
                        style: 'destructive',
                        onPress: () => withdrawMutation.mutate(item.receiver_id),
                      },
                    ])
                  }
                >
                  Withdraw
                </Text>
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="🫥"
              title="No vibes sent yet"
              description="Head to Discover and send your first secret vibe. You get 5 a day."
              action={
                <Text style={styles.link} onPress={() => router.push('/(tabs)/discover')}>
                  Open Discover
                </Text>
              }
            />
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.md,
  },
  kicker: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.light.onSurfaceVariant,
  },
  title: {
    fontFamily: typography.headlineLg.fontFamily,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: colors.light.onSurface,
  },
  hero: {
    margin: spacing.marginMobile,
    borderRadius: radius.lg,
    backgroundColor: colors.light.primary,
    padding: spacing.lg,
  },
  heroNumber: {
    fontFamily: typography.headlineLg.fontFamily,
    fontSize: 56,
    fontWeight: '800',
    color: colors.light.onPrimary,
    lineHeight: 60,
  },
  heroLabel: {
    fontFamily: typography.headlineSm.fontFamily,
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.onPrimary,
  },
  heroNote: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.primaryFixed,
    marginTop: spacing.sm,
    lineHeight: 19,
  },
  sectionTitle: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: typography.labelSm.fontSize,
    letterSpacing: typography.labelSm.letterSpacing,
    color: colors.light.onSurfaceVariant,
    paddingHorizontal: spacing.marginMobile,
    marginBottom: spacing.sm,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  vibeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.light.surfaceContainerLowest,
    borderRadius: radius.default,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  vibeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.light.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibeEmoji: { fontSize: 18 },
  vibeBody: { flex: 1 },
  vibeStatus: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    color: colors.light.onSurface,
  },
  vibeTime: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 10,
    color: colors.light.onSurfaceVariant,
    marginTop: 2,
  },
  withdraw: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    color: colors.light.error,
  },
  link: {
    fontFamily: typography.labelMd.fontFamily,
    fontSize: typography.labelMd.fontSize,
    color: colors.light.primary,
  },
});
