import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import istanbul from 'vite-plugin-istanbul'
import { exclude } from './coverage.config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    process.env.VITE_COVERAGE === 'true' &&
      istanbul({
        include: 'src/**/*.{ts,tsx}',
        exclude,
        extension: ['.ts', '.tsx'],
        requireEnv: false,
        forceBuildInstrument: false,
      }),
  ].filter(Boolean),
})
