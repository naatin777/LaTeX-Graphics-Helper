import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [{
    files: ['**/*.ts'],
}, {
    plugins: {
        '@typescript-eslint': typescriptEslint,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: 'module',
    },

    rules: {
        '@typescript-eslint/naming-convention': ['warn', {
            selector: 'import',
            format: ['camelCase', 'PascalCase'],
        }],

        curly: 'warn',
        eqeqeq: 'warn',
        'no-throw-literal': 'warn',
        semi: 'warn',
        'no-console': ['warn'],
        quotes: ['error', 'single'],
        'prefer-const': ['error'],
        'no-var': ['error'],
        'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
        'eol-last': ['error', 'always'],
    },
}];
