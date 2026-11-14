/**
 * Error handling utilities
 * Maps database/API errors to user-friendly messages
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorMessages: Record<string, string> = {
  // Auth errors
  invalid_credentials: 'Invalid email or verification code',
  user_not_found: 'User not found',
  email_not_confirmed: 'Please verify your email',
  invalid_token: 'Session expired. Please sign in again',
  
  // Supabase RPC errors
  account_restricted: 'Your account has been restricted. Please contact support',
  rate_limited: 'Too many requests. Please slow down',
  daily_limit: 'Daily limit reached. Try again tomorrow',
  not_found: 'Content not found',
  invalid: 'Invalid request',
  
  // Username errors
  username_taken: 'Username is already taken',
  invalid_username: 'Username contains invalid characters',
  
  // College verification
  invalid_college_email: 'Email domain not recognized. Use your college email',
  college_not_found: 'College not found',
  
  // Content moderation
  content_flagged: 'Content violates community guidelines',
  
  // Network
  network_error: 'Network error. Check your connection',
  timeout: 'Request timed out. Please try again',
  
  // Generic
  unknown_error: 'Something went wrong. Please try again',
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = String(error.message);
    
    // Check if it's a known error code
    if (errorMessages[message]) {
      return errorMessages[message];
    }
    
    // Check if it's a PostgreSQL error with a hint
    if ('code' in error && 'hint' in error) {
      const code = String(error.code);
      if (code === '23505') return 'This value is already taken';
      if (code === '23503') return 'Related content not found';
      if (code === 'PGRST116') return 'Content not found';
    }
    
    // Return the raw message if it's user-friendly
    if (message.length < 100 && !message.includes('Error:')) {
      return message;
    }
  }

  return errorMessages.unknown_error;
}

export function handleSupabaseError(error: unknown): never {
  const message = getErrorMessage(error);
  throw new AppError(message, 'supabase_error');
}

// Form validation error mapping
export function getValidationErrors(errors: Record<string, { message?: string }>): Record<string, string> {
  const result: Record<string, string> = {};
  Object.keys(errors).forEach((key) => {
    const error = errors[key];
    if (error?.message) {
      result[key] = error.message;
    }
  });
  return result;
}
