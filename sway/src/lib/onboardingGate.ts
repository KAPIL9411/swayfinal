/**
 * Onboarding gate
 *
 * Signup is anonymous (no email, no OTP), so the only question is whether the
 * user has finished onboarding. Verification with a student ID is the last
 * onboarding step and never blocks getting into the app.
 */

import { authApi } from './api';

export type GateRoute = '/(tabs)/wall' | '/(auth)/college';

export async function nextOnboardingRoute(): Promise<GateRoute> {
  const { profile } = await authApi.me();
  return profile ? '/(tabs)/wall' : '/(auth)/college';
}
