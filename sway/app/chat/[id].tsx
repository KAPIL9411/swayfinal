import { showDialog } from '../../src/lib/dialog';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,

} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, Avatar } from '../../src/components/ui';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { matchesApi } from '../../src/lib/api';
import { queryKeys, queryClient as globalQueryClient } from '../../src/lib/queryClient';
import { timeAgo } from '../../src/theme/interests';
import { getSession } from '../../src/lib/session';

const ICE_BREAKERS = [
  'Okay but what is the campus food actually like?',
  'Most overrated spot on campus — go.',
  'What are you listening to right now?',
];

export default function ChatScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = String(id);

  const [text, setText] = useState('');
  const [myId, setMyId] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    getSession().then((session) => setMyId(session?.userId ?? null));
  }, []);

  const messagesQuery = useQuery({
    queryKey: queryKeys.matches.messages(matchId),
    queryFn: () => matchesApi.getMessages(matchId),
    refetchInterval: 4_000, // simple polling until realtime is wired
  });

  const matchesQuery = useQuery({
    queryKey: queryKeys.matches.all,
    queryFn: matchesApi.getMatches,
  });

  const match = matchesQuery.data?.matches.find((m) => m.id === matchId);

  useEffect(() => {
    matchesApi.markRead(matchId).catch(() => undefined);
  }, [matchId, messagesQuery.data?.messages.length]);

  const sendMutation = useMutation({
    mutationFn: () => matchesApi.sendMessage(matchId, text.trim()),
    onMutate: () => setText(''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.messages(matchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.all });
      globalQueryClient.invalidateQueries({ queryKey: queryKeys.matches.all });
    },
    onError: (err: Error) => showDialog('Message not sent', err.message),
  });

  const unmatchMutation = useMutation({
    mutationFn: () => matchesApi.unmatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.all });
      router.replace('/(tabs)/chats');
    },
    onError: (err: Error) => showDialog('Could not unmatch', err.message),
  });

  const messages = messagesQuery.data?.messages ?? [];

  function confirmUnmatch() {
    showDialog('Unmatch', 'This closes the chat for both of you. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unmatch', style: 'destructive', onPress: () => unmatchMutation.mutate() },
    ]);
  }

  return (
    <ScreenContainer padding={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerIdentity}>
          <Avatar avatarKey={match?.profile?.avatarKey ?? 'otter'} size="sm" />
          <View>
            <Text style={styles.headerUsername}>@{match?.profile?.username ?? 'match'}</Text>
            <Text style={styles.headerMeta}>Vibe match</Text>
          </View>
        </View>
        <TouchableOpacity onPress={confirmUnmatch} hitSlop={10}>
          <Text style={styles.unmatch}>Unmatch</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        {messagesQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.light.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messages}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const isMine = item.sender_id === myId;
              return (
                <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
                      {item.body}
                    </Text>
                    <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
                      {timeAgo(item.created_at)}
                      {isMine && item.read_at ? ' · read' : ''}
                    </Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.iceBreakers}>
                <Text style={styles.iceTitle}>Say something. Anything.</Text>
                {ICE_BREAKERS.map((idea) => (
                  <TouchableOpacity key={idea} style={styles.iceChip} onPress={() => setText(idea)}>
                    <Text style={styles.iceText}>{idea}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
          />
        )}

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.marginMobile) }]}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={(value) => setText(value.slice(0, 1000))}
            placeholder="Message…"
            placeholderTextColor={colors.light.onSurfaceVariant}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !text.trim() && styles.sendDisabled]}
            disabled={!text.trim() || sendMutation.isPending}
            onPress={() => sendMutation.mutate()}
          >
            <Text style={styles.sendText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.outlineVariant,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.surfaceContainerLow,
  },
  backIcon: { fontSize: 18, color: colors.light.onSurface },
  headerIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerUsername: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    fontWeight: '700',
    color: colors.light.onSurface,
  },
  headerMeta: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 10,
    color: colors.light.onSurfaceVariant,
  },
  unmatch: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    color: colors.light.error,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messages: {
    padding: spacing.md,
    gap: spacing.xs,
    flexGrow: 1,
  },
  bubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleTheirs: {
    backgroundColor: colors.light.surfaceContainerLowest,
  },
  bubbleMine: {
    backgroundColor: colors.light.primary,
  },
  bubbleText: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    color: colors.light.onSurface,
    lineHeight: 21,
  },
  bubbleTextMine: {
    color: colors.light.onPrimary,
  },
  bubbleTime: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 9,
    color: colors.light.onSurfaceVariant,
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  bubbleTimeMine: {
    color: colors.light.primaryFixed,
  },
  iceBreakers: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  iceTitle: {
    fontFamily: typography.headlineSm.fontFamily,
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.onSurface,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  iceChip: {
    backgroundColor: colors.light.surfaceContainerLowest,
    borderRadius: radius.default,
    padding: spacing.md,
  },
  iceText: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.onSurfaceVariant,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.marginMobile,
    borderTopWidth: 1,
    borderTopColor: colors.light.outlineVariant,
  },
  input: {
    flex: 1,
    maxHeight: 110,
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
