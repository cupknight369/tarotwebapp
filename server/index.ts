/**
 * Express dev/prod server: Supabase auth callback and Vite middleware (dev) or static assets (prod).
 */

import cookieParser from 'cookie-parser';
import express from 'express';
import { createServer } from 'node:http';
import { createSupabaseClient } from './lib/supabase.js';
import { asyncHandler, errorHandler } from './middleware/errorHandler.js';
import { logServerError } from './serverLog.js';

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
const authMiddleware = asyncHandler(async (req, res, next) => {
  const path = req.path === '' ? '/' : req.path;

  if (path !== '/auth/callback') {
    next();
    return;
  }

  if (req.query.error || typeof req.query.code !== 'string') {
    if (req.query.error) {
      logServerError('authCallback.oauthError', {
        error: String(req.query.error),
        errorDescription:
          typeof req.query.error_description === 'string'
            ? req.query.error_description
            : undefined,
      });
    } else {
      logServerError('authCallback.missingCode', {
        queryKeys: Object.keys(req.query),
      });
    }
    res.redirect(302, '/');
    return;
  }

  const supabase = createSupabaseClient(req, res);
  const { error } = await supabase.auth.exchangeCodeForSession(req.query.code);
  if (error) {
    logServerError('authCallback.exchangeCodeForSession', {
      message: error.message,
      name: error.name,
    });
    res.redirect(302, '/');
    return;
  }
  res.redirect(302, '/');
});

app.use(authMiddleware);

async function setupMiddleware(): Promise<void> {
  try {
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
    app.use(errorHandler);
    createServer(app).listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      if (isDev) {
        console.log('Vite integrated (all requests go through Express auth)');
      }
    });
  } catch (e) {
    logServerError('setupMiddleware', {
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    process.exit(1);
  }
}

void setupMiddleware();
