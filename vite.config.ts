import { defineConfig } from 'vite'
import posthtml from '@vituum/vite-plugin-posthtml'
import posthtmlInclude from 'posthtml-include'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    posthtml({
      // Your existing PostHTML config - adjust paths as needed
      plugins: [
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
