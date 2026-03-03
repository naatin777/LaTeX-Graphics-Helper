import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { createNodeResolver, importX } from 'eslint-plugin-import-x';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
    importX.flatConfigs.recommended,
    importX.flatConfigs.typescript,
    {
        files: ['**/*.ts'],
        plugins: {
            '@typescript-eslint': typescriptEslint,
            'unused-imports': unusedImports,
        },

        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: 'module',
        },

        settings: {
            'import-x/resolver-next': [
                createTypeScriptImportResolver(),
                createNodeResolver(),
            ],
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

            'import-x/order': ['warn', {
                groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                'newlines-between': 'always',
                alphabetize: {
                    order: 'asc',
                    caseInsensitive: true,
                },
            }],

            'unused-imports/no-unused-imports': 'error',
        },
    },
];
