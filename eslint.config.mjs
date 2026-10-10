import tseslint from 'typescript-eslint';
export default tseslint.config(
 { ignores: ['**/dist/**','**/node_modules/**','apps/api/src/generated/**','.agents/**','.claude/**','coverage/**','playwright-report/**','test-results/**'] },
 ...tseslint.configs.recommended,
 { rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] } }
);
