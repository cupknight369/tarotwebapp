import { defineConfig } from 'vite'
import posthtml from '@vituum/vite-plugin-posthtml'
import posthtmlInclude from 'posthtml-include'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    // Third-party Vite plugins are typed loosely; calls are still valid at runtime.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- posthtml factory
    posthtml({
      // Your existing PostHTML config - adjust paths as needed
      plugins: [
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- posthtml-include factory
        posthtmlInclude({
          root: 'src'  // Where your partials live
        })
      ]
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
      }
    }
  },
  server: {
    port: 8001  // Match your existing port
  }
})
