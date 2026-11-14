import { showDialog } from '../src/lib/dialog';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,

} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, Button } from '../src/components/ui';
import { colors, spacing, typography, radius } from '../src/theme/tokens';
import { postsApi, type PostCategory } from '../src/lib/api';
import { queryKeys } from '../src/lib/queryClient';
import { CATEGORIES } from '../src/theme/interests';

const MAX = 500;

export default function ComposeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<PostCategory>('confession');
  const [body, setBody] = useState('');

  const mutation = useMutation({
    mutationFn: () => postsApi.createPost({ category, body: body.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      Keyboard.dismiss();
      router.back();
    },
    onError: (error: Error) => showDialog('Could not post', error.message),
  });

  const remaining = MAX - body.length;
  const canPost = body.trim().length > 0 && !mutation.isPending;

  function handlePost() {
    if (!canPost) return;
    Keyboard.dismiss();
    mutation.mutate();
  }

  return (
    <ScreenContainer padding={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.cancel} onPress={() => router.back()} suppressHighlighting>
            Cancel
          </Text>
          <Text style={styles.kicker}>ANONYMOUS POST</Text>
          <TouchableOpacity
            onPress={Keyboard.dismiss}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Hide keyboard"
          >
            <Text style={styles.done}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.categories}>
            {CATEGORIES.map((item) => {
              const active = category === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.category, active && styles.categoryActive]}
                  onPress={() => setCategory(item.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                    {item.emoji} {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            style={styles.input}
            value={body}
            onChangeText={(text) => setBody(text.slice(0, MAX))}
            placeholder="What's the campus tea?"
            placeholderTextColor={colors.light.onSurfaceVariant}
            multiline
            autoFocus
            textAlignVertical="top"
            keyboardAppearance="light"
          />

          <Text style={styles.note}>
            No name, no handle, no trail. Only the campus sees this.
          </Text>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Text style={[styles.counter, remaining < 40 && styles.counterLow]}>
            {remaining} left
          </Text>
          <Button disabled={!canPost} loading={mutation.isPending} onPress={handlePost}>
            Post it
          </Button>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.md,
  },
  cancel: {
    fontFamily: typography.labelMd.fontFamily,
    fontSize: typography.labelMd.fontSize,
    color: colors.light.onSurfaceVariant,
  },
  kicker: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.light.onSurfaceVariant,
  },
  done: {
    fontFamily: typography.labelMd.fontFamily,
    fontSize: typography.labelMd.fontSize,
    color: colors.light.primary,
  },
  content: {
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: spacing.md,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  category: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.light.surfaceContainerLow,
  },
  categoryActive: {
    backgroundColor: colors.light.secondaryContainer,
  },
  categoryText: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    color: colors.light.onSurfaceVariant,
  },
  categoryTextActive: {
    color: colors.light.onSecondaryContainer,
  },
  input: {
    minHeight: 160,
    backgroundColor: colors.light.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontFamily: typography.bodyLg.fontFamily,
    fontSize: typography.bodyLg.fontSize,
    lineHeight: 26,
    color: colors.light.onSurface,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.light.outlineVariant,
    backgroundColor: colors.light.surface,
  },
  counter: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 12,
    color: colors.light.onSurfaceVariant,
  },
  counterLow: {
    color: colors.light.error,
  },
  note: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    color: colors.light.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
