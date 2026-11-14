import React from 'react';
import {
  Text,
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer, EmptyState, Avatar } from '../../src/components/ui';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { matchesApi } from '../../src/lib/api';
import { queryKeys } from '../../src/lib/queryClient';
import { timeAgo } from '../../src/theme/interests';

export default function ChatsScreen() {
  const router = useRouter();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.matches.all,
    queryFn: matchesApi.getMatches,
    refetchInterval: 15_000,
  });

  const matches = data?.matches ?? [];

  return (
    <ScreenContainer padding={false}>
      <View style={styles.header}>
        <Text style={styles.kicker}>MATCHES</Text>
        <Text style={styles.title}>Chats</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.light.primary} />
        </View>
      ) : isError ? (
        <EmptyState
          icon="📡"
          title="Can't load chats"
          description={(error as Error)?.message ?? 'Check your connection and try again.'}
          action={<Text style={styles.retry} onPress={() => refetch()}>Retry</Text>}
        />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
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
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.75}
              onPress={() => router.push(`/chat/${item.id}`)}
            >
              <Avatar avatarKey={item.profile?.avatarKey ?? 'otter'} size="md" />
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.username}>@{item.profile?.username ?? 'match'}</Text>
                  <Text style={styles.time}>
                    {timeAgo(item.lastMessage?.created_at ?? item.createdAt)}
                  </Text>
                </View>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.lastMessage?.body ?? "You matched — break the ice."}
                </Text>
              </View>
              {item.unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unreadCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="💬"
              title="No matches yet"
              description="When someone vibes you back, a private chat opens up here."
              action={
                <Text style={styles.retry} onPress={() => router.push('/(tabs)/discover')}>
                  Find your people
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.light.surfaceContainerLowest,
    borderRadius: radius.default,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  rowBody: { flex: 1 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  username: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    fontWeight: '700',
    color: colors.light.onSurface,
  },
  time: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 10,
    color: colors.light.onSurfaceVariant,
  },
  preview: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.onSurfaceVariant,
    marginTop: 2,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.light.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 10,
    color: colors.light.onSecondaryContainer,
  },
  retry: {
    fontFamily: typography.labelMd.fontFamily,
    fontSize: typography.labelMd.fontSize,
    color: colors.light.primary,
  },
});
