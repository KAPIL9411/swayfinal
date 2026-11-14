import { z } from 'zod';

// Username validation: 3-20 chars, lowercase alphanumeric, underscore, dot
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-z0-9_.]+$/, 'Username can only contain lowercase letters, numbers, dots, and underscores')
  .refine((val) => !val.startsWith('.') && !val.endsWith('.'), 'Username cannot start or end with a dot')
  .refine((val) => !val.includes('..'), 'Username cannot contain consecutive dots');

// Personal mail providers are not campus mail, even though they are valid emails
const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'me.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
  'rediffmail.com',
  'zoho.com',
  'mail.com',
  'gmx.com',
]);

// Email validation (client-side basic check)
// Any real email domain is allowed here; the API checks it against the
// registered campuses, so we must not assume a .edu / .ac.in style domain.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address')
  .refine(
    (email) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(email.split('@')[1] ?? ''),
    'Invalid email address'
  )
  .refine(
    (email) => !PERSONAL_EMAIL_DOMAINS.has(email.split('@')[1] ?? ''),
    'Use your college email, not a personal one'
  );

// OTP validation
export const otpSchema = z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only digits');

// Profile fields
export const bioSchema = z.string().max(160, 'Bio must be at most 160 characters').optional();

export const yearSchema = z.number().int().min(1).max(7).optional();

export const branchSchema = z.string().max(50).optional();

export const interestsSchema = z
  .array(z.string())
  .min(3, 'Select at least 3 interests')
  .max(10, 'Select at most 10 interests');

export const lookingForSchema = z.enum(['friends', 'dating', 'both']);

// Post creation
export const postBodySchema = z
  .string()
  .min(1, 'Post cannot be empty')
  .max(500, 'Post must be at most 500 characters');

export const postCategorySchema = z.enum(['confession', 'question', 'opinion', 'event', 'meme', 'lost_found']);

export const createPostSchema = z.object({
  category: postCategorySchema,
  body: postBodySchema,
  image: z.string().url().optional(),
});

// Comment creation
export const commentBodySchema = z
  .string()
  .min(1, 'Comment cannot be empty')
  .max(300, 'Comment must be at most 300 characters');

export const createCommentSchema = z.object({
  postId: z.string().uuid(),
  body: commentBodySchema,
  parentId: z.string().uuid().optional(),
});

// Message creation
export const messageBodySchema = z
  .string()
  .min(1, 'Message cannot be empty')
  .max(1000, 'Message must be at most 1000 characters');

// Report
export const reportReasonSchema = z.enum([
  'spam',
  'harassment',
  'hate_speech',
  'sexual_content',
  'violence',
  'impersonation',
  'self_harm',
  'threat_or_self_harm',
  'minor_safety',
  'other',
]);

export const reportSchema = z.object({
  targetType: z.enum(['post', 'comment', 'profile', 'message']),
  targetId: z.string().uuid(),
  reason: reportReasonSchema,
  details: z.string().max(500).optional(),
});

// Onboarding flow
export const onboardingStep1Schema = z.object({
  collegeId: z.string().uuid(),
});

export const onboardingStep2Schema = z.object({
  email: emailSchema,
});

export const onboardingStep3Schema = z.object({
  otp: otpSchema,
});

export const onboardingStep4Schema = z.object({
  username: usernameSchema,
});

export const onboardingStep5Schema = z.object({
  avatarKey: z.string().min(1, 'Please select an avatar'),
});

export const onboardingStep6Schema = z.object({
  interests: interestsSchema,
  lookingFor: lookingForSchema,
});

export const onboardingStep7Schema = z.object({
  is18Confirmed: z.literal(true, { message: 'You must be 18+ to use SWAY' }),
  guidelinesAccepted: z.literal(true, { message: 'You must accept the guidelines' }),
});

// Profile update
export const updateProfileSchema = z.object({
  bio: bioSchema,
  yearOfStudy: yearSchema,
  branch: branchSchema,
  interests: interestsSchema,
  lookingFor: lookingForSchema,
  isDiscoverable: z.boolean(),
});

// Type exports
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
