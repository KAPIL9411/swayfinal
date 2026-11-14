import { showDialog } from '../../src/lib/dialog';
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Button } from '../../src/components/ui';
import { OnboardingHeader } from '../../src/components/OnboardingHeader';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { useQuery } from '@tanstack/react-query';
import { authApi, verificationApi, ApiError } from '../../src/lib/api';
import { useOnboardingStore } from '../../src/features/auth/onboardingStore';
import { queryKeys } from '../../src/lib/queryClient';

type PickedImage = { uri: string; base64: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp' };

/**
 * Student ID verification (fallback for students whose college email does not
 * work). The card is reviewed by an admin, then deleted from storage.
 */
export default function VerifyIdScreen() {
  const router = useRouter();
  const storeCollege = useOnboardingStore((s) => s.college);

  // The onboarding store is cleared once the profile exists, so fall back to
  // the college saved on the profile (also covers app restarts).
  const profileQuery = useQuery({
    queryKey: queryKeys.auth.profile,
    queryFn: authApi.me,
    retry: 1,
  });

  const collegeId = storeCollege?.id ?? profileQuery.data?.profile?.college_id ?? null;
  const collegeName = storeCollege?.name ?? 'Your campus';

  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toPicked(asset: ImagePicker.ImagePickerAsset): PickedImage {
    const mimeType =
      asset.mimeType === 'image/png'
        ? 'image/png'
        : asset.mimeType === 'image/webp'
          ? 'image/webp'
          : 'image/jpeg';

    if (!asset.base64) {
      throw new Error('That photo could not be read. Try another one.');
    }

    return { uri: asset.uri, base64: asset.base64, mimeType };
  }

  async function pickFromLibrary() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to upload your student ID.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.4,
      base64: true,
      exif: false,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    try {
      setPicked(toPicked(result.assets[0]));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function takePhoto() {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Allow camera access to photograph your student ID.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.4,
      base64: true,
      exif: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    try {
      setPicked(toPicked(result.assets[0]));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function submit() {
    if (!picked || !collegeId) return;

    setLoading(true);
    setError(null);

    try {
      await verificationApi.submit({
        collegeId,
        image: `data:${picked.mimeType};base64,${picked.base64}`,
        mimeType: picked.mimeType,
      });
      router.replace('/(auth)/pending');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'too_large') {
        setError('That photo is too large. Try a smaller one.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not upload your ID. Try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer scrollable>
      <OnboardingHeader
        step={6}
        total={6}
        title="Verify you're a student"
        subtitle={`${collegeName} · a real campus needs real students`}
        onBack={() => router.replace('/(tabs)/wall')}
      />

      <View style={styles.explain}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.light.primary} />
        <Text style={styles.explainText}>
          One student ID card, checked once by an admin, then deleted. Until it is approved you can
          browse — posting, comments and vibes unlock after.
        </Text>
      </View>

      {picked ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: picked.uri }} style={styles.preview} resizeMode="cover" />
          <TouchableOpacity style={styles.retake} onPress={() => setPicked(null)}>
            <Text style={styles.retakeText}>Replace photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.dropzone}>
          <Ionicons name="card-outline" size={30} color={colors.light.primary} />
          <Text style={styles.dropTitle}>Add your student ID</Text>
          <Text style={styles.dropHint}>
            Front of the card, name and college visible. Blur anything you don&apos;t want seen.
          </Text>

          <View style={styles.pickRow}>
            <TouchableOpacity style={styles.pickButton} onPress={pickFromLibrary}>
              <Ionicons name="images-outline" size={16} color={colors.light.onSurface} />
              <Text style={styles.pickText}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickButton} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={16} color={colors.light.onSurface} />
              <Text style={styles.pickText}>Camera</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {collegeId ? (
        <Button
          fullWidth
          loading={loading}
          disabled={!picked}
          onPress={submit}
          style={styles.cta}
        >
          Send for review
        </Button>
      ) : (
        <Button fullWidth onPress={() => router.push('/(auth)/college')} style={styles.cta}>
          Choose your college first
        </Button>
      )}

      <TouchableOpacity
        style={styles.skip}
        onPress={() => {
          showDialog(
            'Skip for now?',
            'You can browse the wall, but posting, commenting and sending vibes stay locked until a student ID is approved.',
            [
              { text: 'Stay here', style: 'cancel' },
              { text: 'Skip', onPress: () => router.replace('/(tabs)/wall') },
            ]
          );
        }}
      >
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>

      <Text style={styles.footnote}>
        Only admins can open this photo. It is removed as soon as your request is reviewed.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  explain: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.light.primaryFixed,
    borderRadius: radius.default,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  explainText: {
    flex: 1,
    fontFamily: typography.bodySm.fontFamily,
    fontSize: 13,
    lineHeight: 19,
    color: colors.light.onPrimaryFixed,
  },
  dropzone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.light.outlineVariant,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.light.surfaceContainerLowest,
  },
  dropTitle: {
    fontFamily: typography.headlineSm.fontFamily,
    fontSize: 17,
    fontWeight: '700',
    color: colors.light.onSurface,
    marginTop: spacing.sm,
  },
  dropHint: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: colors.light.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
  pickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.light.surfaceContainerLow,
  },
  pickText: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    color: colors.light.onSurface,
  },
  previewWrap: {
    alignItems: 'center',
  },
  preview: {
    width: '100%',
    height: 190,
    borderRadius: radius.lg,
    backgroundColor: colors.light.surfaceContainerLow,
  },
  retake: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  retakeText: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    color: colors.light.primary,
    textDecorationLine: 'underline',
  },
  error: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.error,
    marginTop: spacing.md,
  },
  cta: {
    marginTop: spacing.lg,
  },
  skip: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: 13,
    color: colors.light.onSurfaceVariant,
    textDecorationLine: 'underline',
  },
  footnote: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: 11,
    lineHeight: 16,
    color: colors.light.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
