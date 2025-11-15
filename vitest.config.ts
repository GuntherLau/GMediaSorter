import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['electron/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    environmentMatchGlobs: [
      ['src/**/*.test.{ts,tsx}', 'jsdom'],
    ],
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: true,
    restoreMocks: true,
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
});
