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
      return res.redirect(302, '/');
    }
    const supabase = createSupabaseClient(req, res);
    supabase.auth.exchangeCodeForSession(req.query.code)
      .then(({ error }: { error: unknown }) => {
        if (error) {
          return res.redirect(302, '/');
        }
        res.redirect(302, '/');
      })
      .catch(() => res.redirect(302, '/'));
    return;
  }

  return next();
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
