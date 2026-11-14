import { showDialog } from '../../src/lib/dialog';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,

  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi, ApiError } from '../../src/lib/api';
import { restoreSession, saveSession } from '../../src/lib/session';

const INK = '#0B0B0F';
const CORAL = '#FF4D5E';
const CORAL_DEEP = '#F0354A';

/** Portrait collage tiles: varied heights keep the masonry feel of the design. */
const TILES: { colors: [string, string]; height: number }[] = [
  { colors: ['#E75480', '#8E2F5B'], height: 132 },
  { colors: ['#D7C7B8', '#8C6F5A'], height: 168 },
  { colors: ['#C9E6D8', '#5E8C74'], height: 128 },
  { colors: ['#A8DCEB', '#3F7C99'], height: 120 },
  { colors: ['#D6C7EF', '#6E5A9C'], height: 150 },
  { colors: ['#F2B8A2', '#A8664C'], height: 120 },
  { colors: ['#EBB7C8', '#9A5A78'], height: 160 },
  { colors: ['#B9C6E8', '#51618C'], height: 124 },
  { colors: ['#E8D8A8', '#937740'], height: 118 },
  { colors: ['#D9A9B8', '#7E4459'], height: 142 },
];

/** One column of the photo wall. */
function Column({ tiles, top }: { tiles: typeof TILES; top: number }) {
  const AVATARS = ['🦦', '🐼', '🦊', '🦉', '🐨', '🦅', '🦜', '🦄', '🌟'];
  return (
    <View style={[styles.column, { marginTop: top }]}>
      {tiles.map((tile, index) => (
        <View key={index} style={[styles.tile, { height: tile.height }]}>
          <LinearGradient
            colors={tile.colors}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.tileGlow} />
          <View style={styles.avatarOverlay}>
            <Text style={styles.avatarEmojiText}>{AVATARS[index % AVATARS.length]}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [starting, setStarting] = useState(false);

  /** No email, no OTP: a Supabase anonymous session is created straight away and the student verifies later with a college ID card. */
  async function start() {
    if (starting) return;
    setStarting(true);

    try {
      const existing = await restoreSession();

      if (!existing) {
        const result = await authApi.anonymous();
        await saveSession({
          accessToken: result.session.access_token,
          refreshToken: result.session.refresh_token,
          expiresAt: result.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
          userId: result.user.id,
        });
      }

      router.push('/(auth)/college');
    } catch (err) {
      showDialog(
        'Could not start',
        err instanceof ApiError ? err.message : 'Check your connection and try again.'
      );
    } finally {
      setStarting(false);
    }
  }

  const columns: (typeof TILES)[] = [TILES.slice(0, 3), TILES.slice(3, 7), TILES.slice(7)];
  const collageHeight = Math.min(560, Math.round(width * 0.92));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Photo wall */}
      <View style={[styles.collage, { height: collageHeight }]} pointerEvents="none">
        <View style={styles.collageRow}>
          <Column tiles={columns[0]} top={-18} />
          <Column tiles={columns[1]} top={12} />
          <Column tiles={columns[2]} top={-34} />
        </View>

        {/* Fade into the page */}
        <LinearGradient
          colors={['rgba(11,11,15,0)', 'rgba(11,11,15,0.55)', INK]}
          locations={[0, 0.62, 1]}
          style={styles.fade}
        />
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 20) + 12 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={styles.title}>Welcome to SWAY</Text>
        <Text style={styles.subtitle}>
          Join millions of students and researchers
        </Text>

        <View style={styles.actions}>
          {/* Heart step badge */}
          <View style={styles.heart}>
            <Ionicons name="heart-outline" size={54} color={CORAL} />
            <Text style={styles.heartNumber}>3</Text>
            <Text style={styles.heartLabel}>of 3</Text>
          </View>

          {/* Discover */}
          <Pressable
            onPress={start}
            disabled={starting}
            style={({ pressed }) => [styles.discover, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Discover"
          >
            <LinearGradient
              colors={[CORAL, CORAL_DEEP]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.discoverText}>
              {starting ? 'Starting…' : 'Discover'}
            </Text>
            <View style={styles.arrowCircle} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: INK,
  },
  collage: {
    width: '100%',
    overflow: 'hidden',
  },
  collageRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
  },
  column: {
    flex: 1,
    gap: 8,
  },
  tile: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  tileGlow: {
    position: 'absolute',
    top: '30%',
    left: '18%',
    width: '64%',
    height: '64%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: '62%',
  },
  contentScroll: {
    flex: 1,
    marginTop: -46,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 0,
  },
  title: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: '#FFFFFF',
  },
  subtitle: {
    marginTop: 14,
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.72)',
  },
  actions: {
    marginTop: 'auto',
    paddingTop: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  heart: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartNumber: {
    position: 'absolute',
    fontSize: 19,
    lineHeight: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: -7,
  },
  heartLabel: {
    position: 'absolute',
    bottom: 16,
    fontSize: 8,
    letterSpacing: 0.2,
    color: 'rgba(255,255,255,0.7)',
  },
  discover: {
    flex: 1,
    height: 62,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 26,
    paddingRight: 7,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  discoverText: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: '#FFFFFF',
  },
  arrowCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    top: '20%',
    left: '20%',
    width: '60%',
    height: '60%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmojiText: {
    fontSize: 24,
    color: '#1A1A1A',
  },
});