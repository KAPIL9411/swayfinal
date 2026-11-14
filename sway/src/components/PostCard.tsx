import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, radius } from '../theme/tokens';
import { CATEGORIES, REACTIONS, timeAgo } from '../theme/interests';
import type { Post, ReactionKind } from '../lib/api';

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  onReact?: (kind: ReactionKind) => void;
  onReport?: () => void;
}

export function PostCard({ post, onPress, onReact, onReport }: PostCardProps) {
  const category = CATEGORIES.find((c) => c.key === post.category);
  const reactionCount = post.reaction_count ?? 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.headerRow}>
        <View style={styles.categoryChip}>
          <Text style={styles.categoryEmoji}>{category?.emoji ?? '📝'}</Text>
          <Text style={styles.categoryLabel}>{category?.label ?? post.category}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.time}>{timeAgo(post.created_at)}</Text>
          {onReport ? (
            <TouchableOpacity onPress={onReport} hitSlop={10} style={styles.more}>
              <Text style={styles.moreText}>⋯</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <Text style={styles.body}>{post.body}</Text>

      {post.image_path ? (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageText}>📷 photo</Text>
        </View>
      ) : null}

      <View style={styles.footerRow}>
        <View style={styles.reactions}>
          {REACTIONS.map((reaction) => {
            const isMine = post.my_reaction === reaction.key;
            return (
              <TouchableOpacity
                key={reaction.key}
                onPress={() => onReact?.(reaction.key as ReactionKind)}
                style={[styles.reaction, isMine && styles.reactionActive]}
                hitSlop={4}
              >
                <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.counts}>
          <Text style={styles.count}>{reactionCount} reactions</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.count}>{post.comment_count ?? 0} comments</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.light.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.light.surfaceContainerLow,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  categoryEmoji: {
    fontSize: 12,
  },
  categoryLabel: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.light.onSurfaceVariant,
  },
  time: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    color: colors.light.onSurfaceVariant,
  },
  more: {
    paddingHorizontal: 4,
  },
  moreText: {
    fontSize: 18,
    color: colors.light.onSurfaceVariant,
  },
  body: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    lineHeight: 23,
    color: colors.light.onSurface,
  },
  imagePlaceholder: {
    marginTop: spacing.sm,
    height: 140,
    borderRadius: radius.md,
    backgroundColor: colors.light.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageText: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 12,
    color: colors.light.onSurfaceVariant,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  reactions: {
    flexDirection: 'row',
    gap: 6,
  },
  reaction: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.light.surfaceContainerLow,
  },
  reactionActive: {
    backgroundColor: colors.light.secondaryContainer,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  counts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  count: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    color: colors.light.onSurfaceVariant,
  },
  dot: {
    color: colors.light.outline,
    fontSize: 11,
  },
});
