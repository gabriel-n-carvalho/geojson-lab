import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'
import { include, exclude } from './coverage.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'happy-dom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: { modules: { classNameStrategy: 'non-scoped' } },
      include: ['src/**/*.test.{ts,tsx}'],
      coverage: {
        provider: 'istanbul',
        reporter: ['text', 'json', 'html', 'lcov'],
        reportsDirectory: './coverage/unit',
        include,
        exclude,
        thresholds: {
          lines: 95,
          functions: 95,
          branches: 90,
          statements: 95,
        },
      },
    },
  }),
)
