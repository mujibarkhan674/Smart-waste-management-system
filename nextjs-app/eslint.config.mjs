import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    },
  },
  {
    // Generated shadcn/ui primitives are kept as upstream ships them.
    files: ['components/ui/**', 'hooks/**'],
    rules: { 'react-hooks/purity': 'off', 'react-hooks/set-state-in-effect': 'off', '@typescript-eslint/no-unused-vars': 'off' },
  },
  globalIgnores(['.next/**', 'node_modules/**', 'drizzle/**', 'next-env.d.ts', '.cache/**']),
])
