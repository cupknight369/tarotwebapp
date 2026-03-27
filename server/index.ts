import 'dotenv/config'
import express from 'express'
declare const __dirname: string
import cookieParser from 'cookie-parser'
import { createServer } from 'http'
import { createSupabaseClient } from './lib/supabase.js'

const app = express();
const PORT = process.env.PORT ?? 8001;
const isDev = process.env.NODE_ENV !== 'production';

// Production specific settings
if (!isDev) {
  app.set('trust proxy', true);
}

app.use(cookieParser());

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const path = req.path === '' ? '/' : req.path

  // Auth callback: validate code server-side with Supabase before granting access
  if (path === '/auth/callback') {
    if (req.query.error || typeof req.query.code !== 'string') {
      return res.redirect(302, '/auth');
    }
    const supabase = createSupabaseClient(req, res);
    supabase.auth.exchangeCodeForSession(req.query.code)
      .then(({ data, error }: { data: unknown; error: unknown }) => {
        if (error) {
          return res.redirect(302, '/auth');
        }
        res.redirect(302, '/');
      })
      .catch(() => res.redirect(302, '/auth'));
    return;
  }

  // Only the login page needs a session check (redirect signed-in users home).
  // Do not call Supabase on `/` or other SPA routes — avoids any SSR cookie edge cases
  // and keeps anonymous access to the canvas reliable.
  if (path !== '/auth') {
    return next();
  }

  const supabase = createSupabaseClient(req, res);
  supabase.auth.getUser()
    .then(({ data: { user }, error }: { data: { user: unknown }; error: unknown }) => {
      const hasSession = !error && !!user;
      if (hasSession) {
        return res.redirect(302, '/');
      }
      next();
    })
    .catch(next);
}

app.use(authMiddleware);

async function setupMiddleware() {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true } });
    app.use(vite.middlewares);
  } else {
    const staticDir = __dirname;
    app.use(express.static(staticDir));
    app.get(['/auth', '/auth/callback'], (_req, res) => {
      res.sendFile('auth.html', { root: staticDir });
    });
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
setupMiddleware();
