/**
 * Analytics tracking
 * PostHog integration placeholder (actual setup after Phase 0)
 */

type EventProperties = Record<string, string | number | boolean | null>;

class Analytics {
  private enabled = __DEV__ ? false : true;

  track(eventName: string, properties?: EventProperties) {
    if (!this.enabled) {
      console.log('[Analytics]', eventName, properties);
      return;
    }

    // TODO: Integrate PostHog after Phase 0
    // posthog.capture(eventName, properties);
  }

  identify(userId: string, traits?: EventProperties) {
    if (!this.enabled) {
      console.log('[Analytics] Identify', userId, traits);
      return;
    }

    // TODO: Integrate PostHog
    // posthog.identify(userId, traits);
  }

  screen(screenName: string, properties?: EventProperties) {
    if (!this.enabled) {
      console.log('[Analytics] Screen', screenName, properties);
      return;
    }

    // TODO: Integrate PostHog
    // posthog.screen(screenName, properties);
  }

  reset() {
    if (!this.enabled) {
      console.log('[Analytics] Reset');
      return;
    }

    // TODO: Integrate PostHog
    // posthog.reset();
  }
}

export const analytics = new Analytics();

// Event names (for consistency)
export const EVENTS = {
  // Auth
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',
  SIGNIN_COMPLETED: 'signin_completed',
  SIGNOUT: 'signout',
  
  // Onboarding
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_ABANDONED: 'onboarding_abandoned',
  
  // Posts
  POST_CREATED: 'post_created',
  POST_VIEWED: 'post_viewed',
  POST_REACTED: 'post_reacted',
  COMMENT_CREATED: 'comment_created',
  
  // Discover
  PROFILE_VIEWED: 'profile_viewed',
  DISCOVER_FILTERED: 'discover_filtered',
  
  // Vibes
  VIBE_SENT: 'vibe_sent',
  VIBE_MATCH: 'vibe_match',
  VIBE_WITHDRAWN: 'vibe_withdrawn',
  
  // Chat
  MESSAGE_SENT: 'message_sent',
  MATCH_UNMATCHED: 'match_unmatched',
  
  // Moderation
  CONTENT_REPORTED: 'content_reported',
  USER_BLOCKED: 'user_blocked',
} as const;
