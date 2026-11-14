export type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  SUPABASE_JWT_SECRET: string;
  EXPO_PUSH_TOKEN?: string;
  RATE_LIMIT?: KVNamespace;
  /**
   * Testing only: when set, this 6 digit code signs in any college email
   * without sending a real OTP mail. Remove before public launch.
   */
  TEST_OTP_CODE?: string;
  /**
   * Comma separated emails that are treated as admins. Bootstrap for the very
   * first admin, before profiles.is_admin exists.
   */
  ADMIN_EMAILS?: string;
};

export type Variables = {
  userId: string;
  token: string;
  userEmail?: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
