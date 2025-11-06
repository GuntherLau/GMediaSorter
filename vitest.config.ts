import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['electron/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
    restoreMocks: true,
  },
});
