import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { aliases } from './config/aliases'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/out/**', '**/.webpack/**'],
  },
  resolve: {
    alias: aliases,
  },
})

