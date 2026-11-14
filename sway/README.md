# SWAY - Mobile App

Campus-only anonymous social app for college students.

## Stack

- **Framework:** Expo 58 + React Native
- **Language:** TypeScript (strict mode)
- **Navigation:** Expo Router
- **State:** TanStack Query + Zustand
- **Backend:** Cloudflare Workers API
- **Database:** Supabase PostgreSQL

## Setup

```bash
npm install
cp .env.example .env
# Fill in Supabase credentials
npm start
```

## Environment Variables

```env
EXPO_PUBLIC_API_URL=https://sway-api.getfixyes.workers.dev
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Project Structure

```
app/                # Screens (Expo Router)
  (auth)/          # Auth flow
  (tabs)/          # Main tabs
src/
  components/ui/   # Reusable UI
  features/        # Feature modules
  lib/             # Core utilities
  theme/           # Design tokens
supabase/          # Database migrations
```

## Scripts

```bash
npm start          # Start dev server
npm run typecheck  # Type checking
npm run lint       # Linting
npm test           # Run tests
npm run format     # Format code
```

## Features

- ✅ Design system with tokens
- ✅ UI components (Button, Avatar, Chip, etc.)
- ✅ API client for backend
- ✅ Supabase integration
- ✅ Form validation (Zod)
- ✅ Testing setup (Jest)

## Development

See `../QUICK_START.md` for complete setup guide.
