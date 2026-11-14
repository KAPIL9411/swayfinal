import { showDialog } from '../../src/lib/dialog';
import React, { useState } from 'react';
import {
  Text,
  StyleSheet,
  FlatList,
  View,
  TouchableOpacity,
  ActivityIndicator,

  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, EmptyState, Avatar, Chip } from '../../src/components/ui';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { discoverApi, vibesApi, type DiscoverProfile, type LookingFor } from '../../src/lib/api';
import { queryKeys } from '../../src/lib/queryClient';

const FILTERS: { key: LookingFor | 'all'; label: string }[] = [
  { key: 'all', label: 'Everyone' },
  { key: 'friends', label: 'Friends' },
  { key: 'dating', label: 'Dating' },
  { key: 'both', label: 'Both' },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<LookingFor | 'all'>('all');

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.discover.profiles({ lookingFor: filter }),
    queryFn: () => discoverApi.getProfiles(filter === 'all' ? {} : { lookingFor: filter }),
  });

  const vibeMutation = useMutation({
    mutationFn: (profile: DiscoverProfile) => vibesApi.send(profile.id),
    onSuccess: (result, profile) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.discover.profiles() });
      queryClient.invalidateQueries({ queryKey: queryKeys.vibes.sent });

      if (result.matched) {
        showDialog(
          "It's a Vibe Match!",
          `You and @${profile.username} both vibed each other. Say hi.`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Open chat', onPress: () => router.push('/(tabs)/chats') },
          ]
        );
      } else {
        showDialog('Vibe sent', `Your secret vibe is out there. If @${profile.username} vibes back, it's a match.`);
      }
    },
    onError: (err: Error) => showDialog('Could not send vibe', err.message),
  });

  const profiles = data?.profiles ?? [];

  return (
    <ScreenContainer padding={false}>
      <View style={styles.header}>
        <Text style={styles.kicker}>LIVE RADAR</Text>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>Students on your campus with shared interests.</Text>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((option) => (
          <Chip
            key={option.key}
            label={option.label}
            selected={filter === option.key}
            onPress={() => setFilter(option.key)}
          />
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.light.primary} />
        </View>
      ) : isError ? (
        <EmptyState
          icon="📡"
          title="Radar offline"
          description={(error as Error)?.message ?? 'Check your connection and try again.'}
          action={
            <TouchableOpacity onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch();
              }}
              tintColor={colors.light.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Avatar avatarKey={item.avatarKey} size="lg" />
                <View style={styles.identity}>
                  <Text style={styles.username}>@{item.username}</Text>
                  <Text style={styles.meta}>
                    {[item.yearOfStudy ? `Year ${item.yearOfStudy}` : null, item.branch]
                      .filter(Boolean)
                      .join(' · ') || 'Campus student'}
                  </Text>
                  {item.sharedInterests.length > 0 ? (
                    <Text style={styles.shared}>
                      {item.sharedInterests.length} shared interest
                      {item.sharedInterests.length === 1 ? '' : 's'}
                    </Text>
                  ) : null}
                </View>
              </View>

              {item.bio ? <Text style={styles.bio}>{item.bio}</Text> : null}

              <View style={styles.interestRow}>
                {item.interests.slice(0, 5).map((interest) => (
                  <View
                    key={interest}
                    style={[styles.interest, item.sharedInterests.includes(interest) && styles.interestShared]}
                  >
                    <Text
                      style={[
                        styles.interestText,
                        item.sharedInterests.includes(interest) && styles.interestTextShared,
                      ]}
                    >
                      {interest}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.vibeButton, item.vibeSent && styles.vibeSent]}
                disabled={item.vibeSent || vibeMutation.isPending}
                onPress={() => vibeMutation.mutate(item)}
              >
                <Text style={styles.vibeText}>
                  {item.vibeSent ? 'Vibe sent ✓' : 'Send Secret Vibe'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="🛰️"
              title="No one to discover yet"
              description="As more students from your campus join, they'll show up here."
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
  subtitle: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.onSurfaceVariant,
    marginTop: 2,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.md,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.light.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  identity: { flex: 1 },
  username: {
    fontFamily: typography.headlineSm.fontFamily,
    fontSize: 20,
    fontWeight: '700',
    color: colors.light.onSurface,
  },
  meta: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.onSurfaceVariant,
  },
  shared: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 10,
    color: colors.light.secondary,
    marginTop: 2,
  },
  bio: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.onSurface,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  interestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  interest: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.light.surfaceContainerLow,
  },
  interestShared: {
    backgroundColor: colors.light.secondaryContainer,
  },
  interestText: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 10,
    color: colors.light.onSurfaceVariant,
  },
  interestTextShared: {
    color: colors.light.onSecondaryContainer,
  },
  vibeButton: {
    marginTop: spacing.md,
    borderRadius: radius.default,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.light.primary,
  },
  vibeSent: {
    backgroundColor: colors.light.surfaceContainerHigh,
  },
  vibeText: {
    fontFamily: typography.labelMd.fontFamily,
    fontSize: typography.labelMd.fontSize,
    letterSpacing: typography.labelMd.letterSpacing,
    color: colors.light.onPrimary,
  },
  retryText: {
    fontFamily: typography.labelMd.fontFamily,
    fontSize: typography.labelMd.fontSize,
    color: colors.light.primary,
  },
});
