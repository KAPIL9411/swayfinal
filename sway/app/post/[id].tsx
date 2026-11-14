import { showDialog } from '../../src/lib/dialog';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,

} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, Avatar } from '../../src/components/ui';
import { PostCard } from '../../src/components/PostCard';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { commentsApi, postsApi, reportsApi, type ReactionKind } from '../../src/lib/api';
import { queryKeys } from '../../src/lib/queryClient';
import { timeAgo } from '../../src/theme/interests';

export default function PostDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = String(id);
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const postQuery = useQuery({
    queryKey: queryKeys.posts.detail(postId),
    queryFn: () => postsApi.getPost(postId),
  });

  const commentsQuery = useQuery({
    queryKey: queryKeys.posts.comments(postId),
    queryFn: () => commentsApi.getComments(postId),
    refetchInterval: 30_000,
  });

  const reactMutation = useMutation({
    mutationFn: (kind: ReactionKind) =>
      postQuery.data?.post.my_reaction === kind
        ? postsApi.unreact(postId)
        : postsApi.react(postId, kind),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
    },
    onError: (err: Error) => showDialog('Could not react', err.message),
  });

  const commentMutation = useMutation({
    mutationFn: () =>
      commentsApi.createComment({
        postId,
        body: comment.trim(),
        parentId: replyTo ?? undefined,
      }),
    onSuccess: () => {
      setComment('');
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.comments(postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
    },
    onError: (err: Error) => showDialog('Could not comment', err.message),
  });

  const reportMutation = useMutation({
    mutationFn: () => reportsApi.report({ targetType: 'post', targetId: postId, reason: 'other' }),
    onSuccess: () => showDialog('Reported', 'Thanks — our moderators will review this post.'),
  });

  const post = postQuery.data?.post;
  const comments = commentsQuery.data?.comments ?? [];

  return (
    <ScreenContainer padding={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={styles.back} />
      </View>

      {postQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.light.primary} />
        </View>
      ) : postQuery.isError || !post ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {(postQuery.error as Error)?.message ?? 'This post is no longer available.'}
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View>
                <PostCard
                  post={post}
                  onReact={(kind) => reactMutation.mutate(kind)}
                  onReport={() =>
                    showDialog('Report post', 'Send this post to the moderators?', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Report',
                        style: 'destructive',
                        onPress: () => reportMutation.mutate(),
                      },
                    ])
                  }
                />
                <Text style={styles.commentsTitle}>
                  {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.comment}>
                <Avatar avatarKey={item.alias.split(' ')[1]?.toLowerCase() ?? 'otter'} size="sm" />
                <View style={styles.commentBody}>
                  <View style={styles.commentMeta}>
                    <Text style={styles.alias}>{item.alias}</Text>
                    {item.is_op ? <Text style={styles.opBadge}>OP</Text> : null}
                    {item.is_mine ? <Text style={styles.youBadge}>YOU</Text> : null}
                    <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
                  </View>
                  <Text style={styles.commentText}>{item.body}</Text>
                  <TouchableOpacity onPress={() => setReplyTo(item.id)}>
                    <Text style={styles.replyAction}>Reply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              commentsQuery.isLoading ? undefined : (
                <Text style={styles.emptyComments}>No comments yet. Say something.</Text>
              )
            }
          />

          {replyTo ? (
            <View style={styles.replyBanner}>
              <Text style={styles.replyBannerText}>Replying to a comment</Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Text style={styles.replyCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View
            style={[
              styles.composer,
              { paddingBottom: Math.max(insets.bottom, spacing.marginMobile) },
            ]}
          >
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={(text) => setComment(text.slice(0, 300))}
              placeholder="Add an anonymous comment…"
              placeholderTextColor={colors.light.onSurfaceVariant}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, !comment.trim() && styles.sendDisabled]}
              disabled={!comment.trim() || commentMutation.isPending}
              onPress={() => commentMutation.mutate()}
            >
              <Text style={styles.sendText}>↑</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.sm,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.surfaceContainerLow,
  },
  backIcon: { fontSize: 18, color: colors.light.onSurface },
  headerTitle: {
    fontFamily: typography.labelMd.fontFamily,
    fontSize: typography.labelMd.fontSize,
    letterSpacing: typography.labelMd.letterSpacing,
    color: colors.light.onSurfaceVariant,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    color: colors.light.onSurfaceVariant,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: spacing.md,
  },
  commentsTitle: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: typography.labelSm.fontSize,
    letterSpacing: typography.labelSm.letterSpacing,
    color: colors.light.onSurfaceVariant,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  comment: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  commentBody: { flex: 1 },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  alias: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.light.onSurface,
  },
  opBadge: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 9,
    color: colors.light.onPrimary,
    backgroundColor: colors.light.primary,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  youBadge: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 9,
    color: colors.light.onSecondaryContainer,
    backgroundColor: colors.light.secondaryContainer,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  commentTime: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 10,
    color: colors.light.onSurfaceVariant,
  },
  commentText: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.onSurface,
    lineHeight: 20,
  },
  replyAction: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 10,
    color: colors.light.primary,
    marginTop: 2,
  },
  emptyComments: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.xs,
    backgroundColor: colors.light.primaryFixed,
  },
  replyBannerText: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    color: colors.light.onPrimaryFixed,
  },
  replyCancel: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    color: colors.light.primary,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.marginMobile,
    borderTopWidth: 1,
    borderTopColor: colors.light.outlineVariant,
    backgroundColor: colors.light.surface,
  },
  commentInput: {
    flex: 1,
    maxHeight: 100,
    minHeight: 44,
    borderRadius: radius.default,
    backgroundColor: colors.light.surfaceContainerLow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    color: colors.light.onSurface,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: colors.light.onPrimary, fontSize: 20, fontWeight: '700' },
});
