import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { restoreSession, clearSession } from '../src/lib/session';
import { nextOnboardingRoute, type GateRoute } from '../src/lib/onboardingGate';
import { colors, spacing, typography } from '../src/theme/tokens';

type Destination = '/(auth)/welcome' | GateRoute;

/**
 * Root index - decides where the user starts:
 * - no session -> welcome
 * - session but no profile -> finish onboarding
 * - session + profile -> app
 */
export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [destination, setDestination] = useState<Destination>('/(auth)/welcome');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const session = await restoreSession();

      if (!session) {
        setDestination('/(auth)/welcome');
        return;
      }

      try {
        // Already onboarded, or send them to the next onboarding step
        setDestination(await nextOnboardingRoute());
      } catch {
        // Session was rejected - start over rather than trapping the user
        await clearSession();
        setDestination('/(auth)/welcome');
        setError('Your session expired. Please sign in again.');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setDestination('/(auth)/welcome');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.light.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loading}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return <Redirect href={destination} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.surface,
    paddingHorizontal: spacing.xl,
  },
  error: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    color: colors.light.error,
    textAlign: 'center',
  },
});
