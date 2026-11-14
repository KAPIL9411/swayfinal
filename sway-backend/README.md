# SWAY Backend - Cloudflare Workers

Backend API for SWAY built with Cloudflare Workers + Hono framework.

## Architecture

- **Runtime**: Cloudflare Workers (Edge)
- **Framework**: Hono (Express-like, optimized for Workers)
- **Database**: Supabase PostgreSQL (via connection pooling)
- **Auth**: Supabase Auth (JWT validation)
- **Deployment**: Cloudflare Workers (globally distributed)

## Why This Stack?

- **Cloudflare Workers**: Near-zero cold starts, global edge deployment
- **Hono**: Tiny, fast, TypeScript-first framework for Workers
- **Supabase DB**: PostgreSQL with Row Level Security
- **Connection Pooling**: Supabase's built-in pooler for serverless

## Structure

```
sway-backend/
├── src/
│   ├── index.ts              # Main entry point
│   ├── routes/
│   │   ├── auth.ts           # Auth routes (OTP, verify)
│   │   ├── posts.ts          # Posts CRUD
│   │   ├── comments.ts       # Comments
│   │   ├── vibes.ts          # Vibe matching
│   │   ├── discover.ts       # Discovery
│   │   ├── matches.ts        # Match management
│   │   └── moderation.ts     # Content moderation
│   ├── middleware/
│   │   ├── auth.ts           # JWT verification
│   │   ├── rateLimit.ts      # Rate limiting
│   │   └── cors.ts           # CORS handling
│   ├── lib/
│   │   ├── db.ts             # Database client
│   │   ├── validation.ts     # Zod schemas
│   │   └── errors.ts         # Error handling
│   └── types/
│       └── index.ts          # TypeScript types
├── wrangler.toml             # Cloudflare config
├── package.json
└── tsconfig.json
```

## Setup

```bash
cd sway-backend

# Install dependencies
npm install

# Set secrets
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_KEY
npx wrangler secret put SUPABASE_JWT_SECRET

# Run locally
npm run dev

# Deploy
npm run deploy
```

## Environment Variables

Required secrets in Cloudflare Workers:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Service role key (admin access)
- `SUPABASE_JWT_SECRET` - JWT secret for token verification
- `EXPO_PUSH_TOKEN` - Expo push notification token (optional)

## API Endpoints

See `../03-tech/api-spec.md` for full API documentation.

## Development

```bash
# Local development with hot reload
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Deploy to production
npm run deploy
```

## Database Connection

Uses Supabase's connection pooler for serverless-friendly connections:
- Transaction mode for short-lived connections
- Session pooling for Workers
- Built-in connection management

## Differences from Supabase Edge Functions

| Feature | Supabase Edge Functions | Cloudflare Workers |
|---------|------------------------|-------------------|
| Runtime | Deno | V8 isolates |
| Language | TypeScript (Deno) | TypeScript (Node.js compatible) |
| Cold Start | ~50-100ms | ~0ms |
| Global Edge | Yes (Fly.io) | Yes (300+ locations) |
| Free Tier | 500K/month | 100K/day |
| Deployment | `supabase functions deploy` | `wrangler deploy` |

## Migration from Supabase Edge Functions

This setup allows you to:
1. Keep the database in Supabase (PostgreSQL with RLS)
2. Keep authentication in Supabase
3. Move API logic to Cloudflare Workers
4. Use Cloudflare's global edge network

The mobile app connects to Cloudflare Workers instead of Supabase directly.
