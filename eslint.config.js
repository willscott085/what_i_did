import eslint from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    ignores: [
      'dist/',
      '.output/',
      'src/routeTree.gen.ts',
      'src/env.d.ts',
      'playwright-report/',
      'test-results/',
    ],
  },
)
