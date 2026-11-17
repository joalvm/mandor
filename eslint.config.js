import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import prettierConfig from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { mandorPlugin } from './tools/eslint-rules/mandor-plugin.js';
import { workspacePackages } from './tools/workspace/workspace-packages.mjs';

/** A ceiling on the code of a file, comments and blank lines left out of the count. */
const maxLines = (max) => ['error', { max, skipBlankLines: true, skipComments: true }];

// Rules that shape the code. Formatting belongs to Prettier and is switched off
// at the end of the array, so a rule here always describes structure, never
// whitespace that a formatter can settle on its own.
const houseRules = {
    'mandor/dialog-needs-policy': 'error',
    'mandor/no-app-kind-branch': 'error',
    'mandor/no-component-prop': 'error',
    'mandor/no-foreign-icon-source': 'error',
    'mandor/no-inline-notice': 'error',
    'mandor/no-native-control': 'error',
    'mandor/no-pending-work-comment': 'error',
    'mandor/no-vendor-primitive': 'error',
    'max-lines': maxLines(200),
    'no-else-return': ['error', { allowElseIf: false }],
    'no-nested-ternary': 'error',
    'max-depth': ['error', 2],
    complexity: ['error', 10],
    'max-statements': ['error', 20],
    'max-params': ['error', 4],
    'one-var': ['error', 'never'],
    eqeqeq: ['error', 'always'],
    // One import per module, its types inline beside its values (`import { a, type B }`): a
    // second line from the same module is a second place to look for what a file takes.
    'no-duplicate-imports': 'error',
    '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: ['const', 'let'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let'], next: ['const', 'let'] },
        { blankLine: 'always', prev: '*', next: ['if', 'for', 'while', 'switch', 'try'] },
        {
            blankLine: 'always',
            prev: ['if', 'for', 'while', 'switch', 'try', 'block-like'],
            next: '*',
        },
    ],
    // `l` asks V8 for its linear engine, which the windows run with: a pattern read with it
    // answers in time proportional to the text.
    'no-invalid-regexp': ['error', { allowConstructorFlags: ['l'] }],
    // Text that becomes code outside the engine of scripts runs with the privileges of main.
    // Scripts run in QuickJS, in a worker; nothing else gets to evaluate a string.
    'no-eval': 'error',
    'no-new-func': 'error',
    '@typescript-eslint/no-implied-eval': 'error',
    'no-restricted-imports': [
        'error',
        {
            paths: [
                {
                    // React 19 hands a component its `ref` as a prop. Under `forwardRef` (and a
                    // bare `memo`) React 19.2 never refreshes a `useEffectEvent` after the first
                    // render: an editor kept writing the request as it was when it mounted.
                    name: 'react',
                    importNames: ['forwardRef'],
                    message:
                        'Take `ref` as a prop: under forwardRef a useEffectEvent keeps what the first render gave it.',
                },
                ...['v8', 'node:v8'].map((name) => ({
                    // V8 freezes its flags once it starts. In Electron a flag set at run time
                    // makes every isolate started after it, a worker thread among them, abort
                    // the whole process. Flags go on the command line the app starts with.
                    name,
                    importNames: ['setFlagsFromString'],
                    message:
                        'Put V8 flags on the command line at startup: set at run time, the next worker kills the process.',
                })),
            ],
        },
    ],
    'no-restricted-syntax': [
        'error',
        {
            selector: 'ExportDefaultDeclaration',
            message:
                'Named exports only: a default export hides the symbol name from the importer.',
        },
        {
            // A type that holds a function drawing a node hides the tree: whoever reads the
            // declaration cannot see what is drawn, only that something will be. The part is a
            // child of the component that declares it, and reads its context through a hook.
            selector:
                ':matches(TSFunctionType, TSMethodSignature) > TSTypeAnnotation > TSTypeReference[typeName.name=/^(ReactNode|ReactElement)$/]',
            message:
                'What is drawn is declared as a child, not as a function that draws: write the part in the tree and read its context with a hook.',
        },
        {
            // A function of the module is declared as one: it reads as a function, is there
            // before the line that uses it, and names itself in a stack trace. An arrow stays for
            // a value typed by what it must be (`const handler: Handler = …`) and for callbacks.
            selector:
                ':matches(Program, ExportNamedDeclaration) > VariableDeclaration[kind="const"] > VariableDeclarator:not([id.typeAnnotation]) > ArrowFunctionExpression.init',
            message:
                'A function of the module is a function declaration: write `function name(…)`, not `const name = (…) =>`.',
        },
    ],
};

// eslint-config-prettier also resets two rules that only fight Prettier under options not used
// here, so they are declared after it. `curly` with "all" is compatible by its documentation.
// `max-len` ignores strings, template literals and URLs, which leaves it comments and regular
// expressions: the text Prettier never wraps. Its limit sits well above Prettier's 100, so it
// leaves the formatter's output alone and only stops a line nobody would read whole.
const rulesPrettierLeaves = {
    '@stylistic/max-len': [
        'error',
        { code: 150, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true },
    ],
    curly: ['error', 'all'],
};

const typedRules = {
    '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],
    // Under `verbatimModuleSyntax`, `import { type A }` leaves `import 'm'` behind in the output:
    // a line that only names types would still run the module. It is written `import type { A }`.
    '@typescript-eslint/no-import-type-side-effects': 'error',
    '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    '@typescript-eslint/no-unnecessary-condition': 'error',
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
};

/** The code of a window above the primitives: shell, what mounts in it, and each renderer. */
const windowSources = [
    ...workspacePackages(import.meta.dirname)
        .filter((each) => each.dir === 'shell' || each.internal.includes('@mandor/shell'))
        .map((each) => `packages/${each.dir}/src/**/*.{ts,tsx}`),
    'apps/*/src/renderer/**/*.{ts,tsx}',
];

export default tseslint.config(
    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            '**/out/**',
            '**/release/**',
            '**/coverage/**',
            '**/.turbo/**',
        ],
    },
    js.configs.recommended,
    {
        plugins: { '@stylistic': stylistic, mandor: mandorPlugin },
        languageOptions: { globals: { ...globals.node } },
        rules: houseRules,
    },
    {
        // Shape of a file, checked only where we author modules. Config files and
        // build scripts answer to the tool that reads them, not to this.
        files: ['packages/*/src/**/*.{ts,tsx}', 'apps/*/src/**/*.{ts,tsx}'],
        rules: {
            'mandor/component-file-holds-components': 'error',
            'mandor/hook-file-name': 'error',
            'mandor/no-component-ternary': 'error',
            'mandor/no-inner-barrel': 'error',
            'mandor/no-loose-component': 'error',
            'mandor/no-role-directory': 'error',
            'mandor/no-vague-file-name': 'error',
            'mandor/one-error-per-file': 'error',
            'mandor/props-type-name': 'error',
            'mandor/require-component-identity': 'error',
        },
    },
    {
        // The rules of hooks and what React assumes while it draws: no ref or clock read in a
        // render, no state set the moment an effect runs, no dependency left out. The compiler
        // itself does not build the apps, so its notice about libraries it would skip is moot.
        files: ['packages/*/src/**/*.{ts,tsx}', 'apps/*/src/**/*.{ts,tsx}'],
        plugins: reactHooks.configs.flat.recommended.plugins,
        rules: {
            ...reactHooks.configs.flat.recommended.rules,
            'react-hooks/exhaustive-deps': 'error',
            'react-hooks/incompatible-library': 'off',
        },
    },
    {
        // What differs by kind (a format, a place, a body, an auth, a scope) is picked from a typed
        // table: every `switch` is a case that grows.
        files: ['packages/*/src/**/*.{ts,tsx}', 'apps/*/src/**/*.{ts,tsx}'],
        rules: { 'mandor/no-kind-branch': 'error' },
    },
    {
        // The two barrels of the repo list a public API and hold no logic, so their length
        // measures how much a package exposes and not how many ideas one file mixes. Capping
        // it would only push exports out of the single file whose job is to name them all.
        // The registry of glyphs is the same list, generated: one line per icon in the collection.
        files: [
            'packages/*/src/index.ts',
            'apps/*/src/renderer/features/*/index.ts',
            'packages/icons/src/icon-registry.ts',
        ],
        rules: { 'max-lines': 'off' },
    },
    {
        // A test file tells one behaviour case by case, with its setup beside it: it grows in
        // cases, not in ideas, and splitting it early scatters a fixture across files or copies
        // it. The ceiling stays, wider.
        files: ['packages/*/tests/**', 'apps/*/tests/**', 'tools/tests/**'],
        rules: { 'max-lines': maxLines(250) },
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
        languageOptions: {
            parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
        },
        rules: typedRules,
    },
    {
        // The window lets go of a promise through fireAndForget, which writes its rejection in
        // the log; a bare `void` leaves it loose in the console. Main keeps `void`: a fault loose
        // there is already logged and told to the person.
        files: windowSources,
        rules: { '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false }] },
    },
    {
        // Declaration merging is interface-only in TypeScript. Library augmentations
        // use it by contract; authored application and package types remain aliases.
        files: ['**/*.d.ts'],
        rules: { '@typescript-eslint/consistent-type-definitions': 'off' },
    },
    {
        files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
        extends: [tseslint.configs.disableTypeChecked],
    },
    {
        // Build tools read their configuration from a default export. The ban on
        // default exports protects our own modules, not the shape a tool demands.
        files: ['eslint.config.js', '**/*.config.{js,mjs,cjs,ts}'],
        rules: { 'no-restricted-syntax': 'off' },
    },
    prettierConfig,
    { rules: rulesPrettierLeaves },
);
