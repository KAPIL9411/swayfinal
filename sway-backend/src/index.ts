/**
 * SWAY Backend API
 * Cloudflare Workers + Hono
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth';
import { collegesRoutes } from './routes/colleges';
import { postsRoutes } from './routes/posts';
import { commentsRoutes } from './routes/comments';
import { vibesRoutes } from './routes/vibes';
import { discoverRoutes } from './routes/discover';
import { matchesRoutes } from './routes/matches';
import { reportsRoutes } from './routes/reports';
import { verificationRoutes } from './routes/verification';
import { errorHandler } from './middleware/errorHandler';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '';
      if (
        origin === 'https://sway.app' ||
        // PWA: production plus every preview deployment *.sway.pages.dev
        origin === 'https://sway.pages.dev' ||
        /^https:\/\/[a-z0-9-]+\.sway\.pages\.dev$/.test(origin) ||
        // Admin panel (sway-admin-ch3.pages.dev) plus its preview deployments
        /^https:\/\/([a-z0-9-]+\.)?sway-admin-ch3\.pages\.dev$/.test(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('exp://') ||
        origin.startsWith('exps://')
      ) {
        return origin;
      }
      return '';
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86400,
  })
);

app.get('/', (c) =>
  c.json({
    name: 'SWAY API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.route('/auth', authRoutes);
app.route('/colleges', collegesRoutes);
app.route('/posts', postsRoutes);
app.route('/comments', commentsRoutes);
app.route('/vibes', vibesRoutes);
app.route('/discover', discoverRoutes);
app.route('/matches', matchesRoutes);
app.route('/reports', reportsRoutes);
app.route('/verification', verificationRoutes);

app.onError(errorHandler);

app.notFound((c) => c.json({ error: 'Not found', path: c.req.path }, 404));

export default app;
