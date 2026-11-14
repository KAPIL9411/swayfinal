/**
 * Onboarding state
 * Holds choices made before the profile exists (college, email, username...).
 * In-memory only: if the app is killed mid-onboarding the user starts over,
 * which is fine because no account data has been written yet.
 */

import { create } from 'zustand';

export interface OnboardingCollege {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
}

export type LookingFor = 'friends' | 'dating' | 'both';

interface OnboardingState {
  college: OnboardingCollege | null;
  email: string;
  username: string;
  avatarKey: string;
  interests: string[];
  lookingFor: LookingFor;
  setCollege: (college: OnboardingCollege) => void;
  setEmail: (email: string) => void;
  setUsername: (username: string) => void;
  setAvatarKey: (avatarKey: string) => void;
  setInterests: (interests: string[]) => void;
  setLookingFor: (lookingFor: LookingFor) => void;
  reset: () => void;
}

const initial = {
  college: null as OnboardingCollege | null,
  email: '',
  username: '',
  avatarKey: '',
  interests: [] as string[],
  lookingFor: 'both' as LookingFor,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initial,
  setCollege: (college) => set({ college }),
  setEmail: (email) => set({ email }),
  setUsername: (username) => set({ username }),
  setAvatarKey: (avatarKey) => set({ avatarKey }),
  setInterests: (interests) => set({ interests }),
  setLookingFor: (lookingFor) => set({ lookingFor }),
  reset: () => set(initial),
}));
