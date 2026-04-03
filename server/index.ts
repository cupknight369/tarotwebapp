/**
 * Express dev/prod server: Supabase auth callback and Vite middleware (dev) or static assets (prod).
 */

import cookieParser from 'cookie-parser';
import express, { type RequestHandler } from 'express';
import { createServer } from 'node:http';
import { createSupabaseClient } from './lib/supabase.js';

declare const __dirname: string;

const app = express();
const PORT = process.env.PORT ?? 8001;
const isDev = process.env.NODE_ENV !== 'production';

if (!isDev) {
  app.set('trust proxy', true);
}

app.use(cookieParser());

/**
 * Handles `/auth/callback` by exchanging the OAuth code for a session; otherwise passes through.
 */
const authMiddleware: RequestHandler = (req, res, next) => {
  const path = req.path === '' ? '/' : req.path;

  if (path === '/auth/callback') {
    if (req.query.error || typeof req.query.code !== 'string') {
      res.redirect(302, '/');
      return;
    }
    const supabase = createSupabaseClient(req, res);
    supabase.auth
      .exchangeCodeForSession(req.query.code)
      .then(({ error }: { error: unknown }) => {
        if (error) {
          res.redirect(302, '/');
          return;
        }
        res.redirect(302, '/');
      })
      .catch(() => {
        res.redirect(302, '/');
      });
    return;
  }

  next();
};

app.use(authMiddleware);

async function setupMiddleware(): Promise<void> {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true } });
    app.use(vite.middlewares);
  } else {
    const staticDir = __dirname;
    app.use(express.static(staticDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile('index.html', { root: staticDir });
    });
  }
  createServer(app).listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    if (isDev) {
      console.log('Vite integrated (all requests go through Express auth)');
    }
  });
}

void setupMiddleware();
