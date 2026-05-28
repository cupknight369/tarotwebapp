import { defineConfig, loadEnv } from 'vite';
import posthtml from '@vituum/vite-plugin-posthtml';
import posthtmlInclude from 'posthtml-include';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      tailwindcss(),
      // Third-party Vite plugins are typed loosely; calls are still valid at runtime.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- posthtml factory
      posthtml({
        plugins: [
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- posthtml-include factory
          posthtmlInclude({
            root: 'src',
          }),
        ],
      }),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        injectRegister: false,
        devOptions: {
          enabled: true,
          // injectManifest dev SW is ESM (uses import.meta); must register as module.
          // Explicit type also avoids vite-plugin-pwa passing "undefined" to Firefox.
          type: 'module',
        },
        manifest: {
          name: 'Cup Knight Tarot',
          short_name: 'CK Tarot',
          description: 'Customizeable Tarot Journal',
          theme_color: '#101828',
          background_color: '#101828',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,webp,svg,woff2}'],
        },
      }),
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: './index.html',
        },
      },
    },
    server: {
      port: 8001,
    },
  };
});
