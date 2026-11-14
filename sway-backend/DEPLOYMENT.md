# Deployment Guide - SWAY Backend on Cloudflare Workers

## Prerequisites

1. **Cloudflare Account** (free tier works)
2. **Wrangler CLI** installed: `npm install -g wrangler`
3. **Supabase Project** with database setup

## Setup

### 1. Install Dependencies

```bash
cd sway-backend
npm install
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Configure Secrets

Set your Supabase credentials as Cloudflare secrets:

```bash
# Supabase URL
wrangler secret put SUPABASE_URL
# Enter: https://your-project.supabase.co

# Supabase Service Role Key (from Supabase Dashboard > Settings > API)
wrangler secret put SUPABASE_SERVICE_KEY
# Enter: your-service-role-key

# JWT Secret (from Supabase Dashboard > Settings > API > JWT Settings)
wrangler secret put SUPABASE_JWT_SECRET
# Enter: your-jwt-secret

# Optional: Expo Push Token (for notifications)
wrangler secret put EXPO_PUSH_TOKEN
```

### 4. Update wrangler.toml

Edit `wrangler.toml` and add your Cloudflare account ID:

```toml
account_id = "your-cloudflare-account-id"
```

Find your account ID at: https://dash.cloudflare.com/ (in the URL or sidebar)

## Local Development

```bash
# Start development server
npm run dev

# Access at http://localhost:8787
```

Test endpoints:
```bash
curl http://localhost:8787/health
```

## Deploy to Production

```bash
# Deploy to Cloudflare Workers
npm run deploy
```

Your API will be available at:
```
https://sway-api.your-subdomain.workers.dev
```

## Custom Domain (Optional)

1. Go to Cloudflare Dashboard > Workers & Pages
2. Select your worker `sway-api`
3. Click "Triggers" tab
4. Add "Custom Domain"
5. Enter: `api.yourdomain.com`

Update `wrangler.toml`:
```toml
[env.production]
name = "sway-api-prod"
routes = [
  { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

## Update Mobile App

In your Expo app, update the API URL:

**sway/.env**:
```env
EXPO_PUBLIC_API_URL=https://sway-api.your-subdomain.workers.dev
# Or your custom domain
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
```

**sway/src/lib/api.ts** (create new file):
```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function apiRequest(
  endpoint: string,
  options?: RequestInit,
  token?: string
) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}
```

## Monitoring

### View Logs
```bash
wrangler tail
```

### Metrics
Visit: https://dash.cloudflare.com/workers

- Request count
- Success rate
- P50/P99 latency
- Error rate

## CI/CD with GitHub Actions

Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'sway-backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd sway-backend
          npm ci
      
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: 'sway-backend'
```

Set `CLOUDFLARE_API_TOKEN` in GitHub repository secrets.

## Cost Estimate

**Cloudflare Workers Free Tier:**
- 100,000 requests/day
- Free SSL
- Global edge network

**Paid Plan ($5/month):**
- 10 million requests/month
- Then $0.50 per additional million

**For MVP (single campus, 2000 students):**
- Free tier should be sufficient
- ~1000 daily active users = ~50K requests/day

## Troubleshooting

### "Module not found"
```bash
npm install
npm run deploy
```

### "Invalid JWT"
- Verify `SUPABASE_JWT_SECRET` matches your Supabase project
- Check token in Authorization header is valid

### "Connection timeout"
- Supabase instance may be sleeping (free tier)
- Check Supabase status: https://status.supabase.com

### Database RLS errors
- Ensure service role key is used (bypasses RLS)
- Check RLS policies are correctly defined

## Performance Tips

1. **Enable connection pooling** in Supabase (Settings > Database > Connection Pooling)
2. **Use transaction mode** for Workers
3. **Cache frequently accessed data** with Cloudflare KV
4. **Enable Cloudflare Caching** for static endpoints

---

**Your backend is now deployed globally! 🌍**
