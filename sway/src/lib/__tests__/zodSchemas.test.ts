import {
  usernameSchema,
  emailSchema,
  otpSchema,
  postBodySchema,
  commentBodySchema,
} from '../zodSchemas';

describe('zodSchemas', () => {
  describe('usernameSchema', () => {
    it('should accept valid usernames', () => {
      expect(usernameSchema.safeParse('john_doe').success).toBe(true);
      expect(usernameSchema.safeParse('user123').success).toBe(true);
      expect(usernameSchema.safeParse('test.user').success).toBe(true);
      expect(usernameSchema.safeParse('abc').success).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(usernameSchema.safeParse('ab').success).toBe(false); // too short
      expect(usernameSchema.safeParse('a'.repeat(21)).success).toBe(false); // too long
      expect(usernameSchema.safeParse('User Name').success).toBe(false); // has space
      expect(usernameSchema.safeParse('User-Name').success).toBe(false); // has dash
      expect(usernameSchema.safeParse('UPPERCASE').success).toBe(false); // uppercase
      expect(usernameSchema.safeParse('.startwithdot').success).toBe(false); // starts with dot
      expect(usernameSchema.safeParse('endwithdot.').success).toBe(false); // ends with dot
      expect(usernameSchema.safeParse('double..dot').success).toBe(false); // consecutive dots
    });
  });

  describe('emailSchema', () => {
    it('should accept valid college emails', () => {
      expect(emailSchema.safeParse('student@iitd.ac.in').success).toBe(true);
      expect(emailSchema.safeParse('john@students.xaviers.edu').success).toBe(true);
      expect(emailSchema.safeParse('0221cse182@niet.co.in').success).toBe(true);
      expect(emailSchema.safeParse('  Roll.No1@College.AC.IN ').success).toBe(true);
    });

    it('should reject personal and malformed emails', () => {
      expect(emailSchema.safeParse('user@gmail.com').success).toBe(false);
      expect(emailSchema.safeParse('test@yahoo.com').success).toBe(false);
      expect(emailSchema.safeParse('invalid-email').success).toBe(false);
      expect(emailSchema.safeParse('user@localhost').success).toBe(false);
    });
  });

  describe('otpSchema', () => {
    it('should accept valid OTPs', () => {
      expect(otpSchema.safeParse('123456').success).toBe(true);
      expect(otpSchema.safeParse('000000').success).toBe(true);
    });

    it('should reject invalid OTPs', () => {
      expect(otpSchema.safeParse('12345').success).toBe(false); // too short
      expect(otpSchema.safeParse('1234567').success).toBe(false); // too long
      expect(otpSchema.safeParse('12345a').success).toBe(false); // has letter
      expect(otpSchema.safeParse('12 345').success).toBe(false); // has space
    });
  });

  describe('postBodySchema', () => {
    it('should accept valid post bodies', () => {
      expect(postBodySchema.safeParse('Valid post content').success).toBe(true);
      expect(postBodySchema.safeParse('A'.repeat(500)).success).toBe(true);
    });

    it('should reject invalid post bodies', () => {
      expect(postBodySchema.safeParse('').success).toBe(false); // empty
      expect(postBodySchema.safeParse('A'.repeat(501)).success).toBe(false); // too long
    });
  });

  describe('commentBodySchema', () => {
    it('should accept valid comment bodies', () => {
      expect(commentBodySchema.safeParse('Valid comment').success).toBe(true);
      expect(commentBodySchema.safeParse('A'.repeat(300)).success).toBe(true);
    });

    it('should reject invalid comment bodies', () => {
      expect(commentBodySchema.safeParse('').success).toBe(false); // empty
      expect(commentBodySchema.safeParse('A'.repeat(301)).success).toBe(false); // too long
    });
  });
});
