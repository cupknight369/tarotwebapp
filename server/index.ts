import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'
import { createSupabaseClient } from './lib/supabase.js'

const app = express();
const PORT = process.env.PORT ?? 8001;
const isDev = process.env.NODE_ENV !== 'production';

app.use(cookieParser());

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const path = req.path

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

  const supabase = createSupabaseClient(req, res);

  supabase.auth.getUser()
    .then(({ data: { user }, error }: { data: { user: unknown }; error: unknown }) => {
      const hasSession = !error && !!user;

      if (path === '/' || path === '') {
        if (!hasSession) {
          return res.redirect(302, '/auth');
        }
      } else if (path === '/auth') {
        if (hasSession) {
          return res.redirect(302, '/');
        }
      }

      next();
    })
    .catch(next);
}

app.use(authMiddleware);

if (isDev) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({ server: { middlewareMode: true } });
  app.use(vite.middlewares);
} else {
  app.use(express.static('dist'));
  app.get(['/auth', '/auth/callback'], (_req, res) => {
    res.sendFile('auth.html', { root: 'dist' });
  });
  app.get('/{*splat}', (_req, res) => {
    res.sendFile('index.html', { root: 'dist' });
  });
}

createServer(app).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  if (isDev) {
    console.log('Vite integrated (all requests go through Express auth)');
  }
})
