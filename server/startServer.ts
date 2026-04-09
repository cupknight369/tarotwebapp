/**
 * Boots the HTTP server (used by main entry and tests).
 */

import { createServer } from 'node:http';

import { createApp } from './createApp.js';
import { logServerError } from './serverLog.js';

const PORT = process.env.PORT ?? 8001;

/**
 * Creates the app and listens on `PORT`.
 *
 * @returns Resolves after `listen` succeeds (callback invoked).
 */
export async function startServer(): Promise<void> {
  const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  try {
    const app = await createApp(mode);
    createServer(app).listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      if (mode === 'development') {
        console.log('Vite integrated (all requests go through Express auth)');
      }
    });
  } catch (e) {
    logServerError('startServer', {
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    process.exit(1);
  }
}
