import { showDialog } from '../../src/lib/dialog';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,

  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, Button, EmptyState } from '../../src/components/ui';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { verificationApi, ApiError, type AdminVerificationRequest } from '../../src/lib/api';

/**
 * Admin-only review queue for student ID cards.
 * Reachable from the Me tab when profiles.is_admin is true.
 */
export default function AdminReviewsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'verifications'],
    queryFn: verificationApi.adminList,
  });

  const review = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      verificationApi.review(
        id,
        action,
        action === 'reject' ? 'The student ID could not be verified.' : undefined
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] }),
    onError: (err: Error) => showDialog('Could not save', err.message),
  });

  const requests = data?.requests ?? [];

  function confirm(request: AdminVerificationRequest, action: 'approve' | 'reject') {
    showDialog(
      action === 'approve' ? 'Approve this student?' : 'Reject this ID?',
      action === 'approve'
        ? `${request.email ?? 'This student'} will be able to finish onboarding.`
        : 'They will be asked to upload a clearer photo.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Reject',
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: () => review.mutate({ id: request.id, action }),
        },
      ]
    );
  }

  return (
    <ScreenContainer padding={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.kicker}>ADMIN</Text>
        <Text style={styles.title}>ID review queue</Text>
        <Text style={styles.subtitle}>
          {requests.length} waiting · photos are deleted once you decide
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.light.primary} />
        </View>
      ) : isError ? (
        <EmptyState
          icon="📡"
          title="Queue unavailable"
          description={
            errMessage(error) ||
            'The verification tables may not be created yet. Run the SQL from the README.'
          }
          action={
            <Button size="sm" onPress={() => refetch()}>
              Retry
            </Button>
          }
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void refetch();
              }}
              tintColor={colors.light.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState icon="✅" title="Queue is clear" description="No student IDs are waiting for review." />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.cardMeta}>
                  <Text style={styles.college} numberOfLines={1}>
                    {item.collegeName ?? 'College not set'}
                  </Text>
                  <Text style={styles.email} numberOfLines={1}>
                    {item.email ?? 'unknown email'}
                  </Text>
                </View>
                <Text style={styles.time}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>

              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.photo} resizeMode="cover" />
              ) : (
                <View style={styles.photoMissing}>
                  <Text style={styles.photoMissingText}>Photo unavailable</Text>
                </View>
              )}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.action, styles.reject]}
                  disabled={review.isPending}
                  onPress={() => confirm(item, 'reject')}
                >
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.action, styles.approve]}
                  disabled={review.isPending}
                  onPress={() => confirm(item, 'approve')}
                >
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}

function errMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return (error as Error)?.message;
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.sm,
  },
  back: {
    fontFamily: typography.labelMd.fontFamily,
    fontSize: typography.labelMd.fontSize,
    color: colors.light.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  kicker: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.light.onSurfaceVariant,
  },
  title: {
    fontFamily: typography.headlineLg.fontFamily,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.light.onSurface,
  },
  subtitle: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: 13,
    color: colors.light.onSurfaceVariant,
    marginTop: 2,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    padding: spacing.marginMobile,
    paddingBottom: spacing['2xl'],
  },
  card: {
    backgroundColor: colors.light.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardMeta: { flex: 1 },
  college: {
    fontFamily: typography.headlineSm.fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: colors.light.onSurface,
  },
  email: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: 12,
    color: colors.light.onSurfaceVariant,
  },
  time: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 10,
    color: colors.light.onSurfaceVariant,
  },
  photo: {
    width: '100%',
    height: 190,
    borderRadius: radius.default,
    marginTop: spacing.sm,
    backgroundColor: colors.light.surfaceContainerLow,
  },
  photoMissing: {
    height: 120,
    borderRadius: radius.default,
    marginTop: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.surfaceContainerLow,
  },
  photoMissingText: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: 12,
    color: colors.light.onSurfaceVariant,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  action: {
    flex: 1,
    height: 44,
    borderRadius: radius.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reject: {
    backgroundColor: colors.light.errorContainer,
  },
  rejectText: {
    fontFamily: typography.labelMd.fontFamily,
    fontSize: 12,
    color: colors.light.onErrorContainer,
  },
  approve: {
    backgroundColor: colors.light.primary,
  },
  approveText: {
    fontFamily: typography.labelMd.fontFamily,
    fontSize: 12,
    color: colors.light.onPrimary,
  },
});
