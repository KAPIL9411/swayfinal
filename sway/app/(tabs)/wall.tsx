import { showDialog } from '../../src/lib/dialog';
import React, { useMemo, useState } from 'react';
import {
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  View,
  TouchableOpacity,

} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, EmptyState } from '../../src/components/ui';
import { PostCard } from '../../src/components/PostCard';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import {
  postsApi,
  reportsApi,
  verificationApi,
  type Post,
  type ReactionKind,
} from '../../src/lib/api';
import { queryKeys } from '../../src/lib/queryClient';
import { CATEGORIES } from '../../src/theme/interests';

type Filter = 'all' | Post['category'];

export default function WallScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.posts.feed(),
    queryFn: postsApi.getFeed,
    refetchInterval: 60_000,
  });

  const verificationQuery = useQuery({
    queryKey: ['verification', 'me'],
    queryFn: verificationApi.me,
    staleTime: 60_000,
  });

  const verification = verificationQuery.data;
  const isVerified = Boolean(verification?.emailDomainVerified) || verification?.status === 'approved';
  // While the status is still loading, let people through instead of bouncing
  // verified students to the upload screen.
  const needsVerification = Boolean(verification) && !isVerified;
  const isPending = verification?.status === 'pending';

  function openCompose() {
    router.push(needsVerification ? '/(auth)/verify-id' : '/compose');
  }

  const reactMutation = useMutation({
    mutationFn: async ({ post, kind }: { post: Post; kind: ReactionKind }) => {
      if (post.my_reaction === kind) return postsApi.unreact(post.id);
      return postsApi.react(post.id, kind);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed() }),
    onError: (err: Error) => showDialog('Could not react', err.message),
  });

  const reportMutation = useMutation({
    mutationFn: (postId: string) =>
      reportsApi.report({ targetType: 'post', targetId: postId, reason: 'other' }),
    onSuccess: () => showDialog('Reported', 'Thanks — our moderators will review this post.'),
    onError: (err: Error) => showDialog('Could not report', err.message),
  });

  const posts = useMemo(() => {
    const list = data?.posts ?? [];
    return filter === 'all' ? list : list.filter((p) => p.category === filter);
  }, [data?.posts, filter]);

  function confirmReport(post: Post) {
    showDialog('Report post', 'Report this post to the moderators?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', style: 'destructive', onPress: () => reportMutation.mutate(post.id) },
    ]);
  }

  return (
    <ScreenContainer padding={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>CAMPUS PULSE</Text>
          <Text style={styles.title}>Vibe Wall</Text>
        </View>
        <TouchableOpacity style={styles.composeButton} onPress={openCompose}>
          <Text style={styles.composeIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {needsVerification ? (
        <TouchableOpacity
          style={styles.verifyBanner}
          onPress={() => router.push(isPending ? '/(auth)/pending' : '/(auth)/verify-id')}
          accessibilityRole="button"
        >
          <Text style={styles.verifyBannerText}>
            {isPending
              ? 'Your student ID is under review — posting unlocks after approval'
              : 'Verify your student ID to post, comment and vibe'}
          </Text>
          <Text style={styles.verifyBannerCta}>{isPending ? 'Status' : 'Verify'}</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.filters}>
        <FlatList
          horizontal
          data={[{ key: 'all', label: 'All' }, ...CATEGORIES] as any[]}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item }) => {
            const isActive = filter === item.key;
            return (
              <TouchableOpacity
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilter(item.key as Filter)}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {item.emoji ? `${item.emoji} ` : ''}
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.light.primary} />
        </View>
      ) : isError ? (
        <EmptyState
          icon="📡"
          title="Can't load the wall"
          description={(error as Error)?.message ?? 'Check your connection and try again.'}
          action={
            <TouchableOpacity onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <FlatList
          data={posts}
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
            <PostCard
              post={item}
              onPress={() => router.push(`/post/${item.id}`)}
              onReact={(kind) => reactMutation.mutate({ post: item, kind })}
              onReport={() => confirmReport(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="📝"
              title={filter === 'all' ? 'Nothing here yet' : 'No posts in this category'}
              description="Be the first to say something. Anonymous, always."
            />
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
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
  composeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeIcon: {
    fontSize: 26,
    color: colors.light.onPrimary,
    marginTop: -2,
  },
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.marginMobile,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.default,
    backgroundColor: colors.light.primaryFixed,
  },
  verifyBannerText: {
    flex: 1,
    fontFamily: typography.bodySm.fontFamily,
    fontSize: 12,
    lineHeight: 17,
    color: colors.light.onPrimaryFixed,
  },
  verifyBannerCta: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.light.primary,
    textTransform: 'uppercase',
  },
  filters: {
    marginBottom: spacing.sm,
  },
  filterContent: {
    paddingHorizontal: spacing.marginMobile,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.light.surfaceContainerLow,
    marginRight: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.light.secondaryContainer,
  },
  filterText: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 12,
    color: colors.light.onSurfaceVariant,
  },
  filterTextActive: {
    color: colors.light.onSecondaryContainer,
  },
  list: {
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontFamily: typography.labelMd.fontFamily,
    fontSize: typography.labelMd.fontSize,
    color: colors.light.primary,
  },
});
