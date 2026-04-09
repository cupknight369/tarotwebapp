import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/__tests__/**/*.test.ts', 'server/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts', 'server/**/*.ts'],
      exclude: [
        '**/node_modules/**',
        'src/proto/generated/**',
        'src/__tests__/**',
        'server/__tests__/**',
        '**/*.test.ts',
        'src/types/vite-env.d.ts',
        'vite.config.ts',
        'vitest.config.ts',
        'vitest.setup.ts',
        'server/main.ts',
      ],
    },
  },
});
