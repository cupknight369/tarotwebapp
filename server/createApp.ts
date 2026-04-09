/**
 * Builds the Express application for development, production, or automated tests.
 */

import cookieParser from 'cookie-parser';
import express from 'express';
import type { Express, Request, Response } from 'express';

import { createSupabaseClient } from './lib/supabase.js';
import { asyncHandler, errorHandler } from './middleware/errorHandler.js';
import { logServerError } from './serverLog.js';

/** How static assets and Vite are wired (or omitted in test mode). */
export type AppMode = 'development' | 'production' | 'test';

declare const __dirname: string;

/**
 * Creates and configures the Express app. Does not listen on a port.
 *
 * @param mode - `development` (Vite middleware), `production` (static dist), or `test` (minimal stack).
 * @returns Configured Express application with the error handler mounted.
 */
export async function createApp(mode: AppMode): Promise<Express> {
  const app = express();

  if (mode === 'production') {
    app.set('trust proxy', true);
  }

  app.use(cookieParser());

  const authMiddleware = asyncHandler(async (req, res, next) => {
    const path = req.path === '' ? '/' : req.path;

    if (path !== '/auth/callback') {
      next();
      return;
    }

    if (req.query.error || typeof req.query.code !== 'string') {
      if (req.query.error) {
        const oauthError = req.query.error;
        logServerError('authCallback.oauthError', {
          error: typeof oauthError === 'string' ? oauthError : JSON.stringify(oauthError),
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

    const supabase = createSupabaseClient(req as Request, res as Response);
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

  if (mode === 'development') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true } });
    app.use(vite.middlewares);
  } else if (mode === 'production') {
    const staticDir = __dirname;
    app.use(express.static(staticDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile('index.html', { root: staticDir });
    });
  } else {
    app.get('/health', (_req, res) => {
      res.status(200).type('text/plain').send('ok');
    });
  }

  app.use(errorHandler);
  return app;
}
