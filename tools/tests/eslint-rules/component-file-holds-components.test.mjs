import tsParser from '@typescript-eslint/parser';
import { describe, it } from 'vitest';

import { componentFileHoldsComponents } from '../../eslint-rules/component-file-holds-components.js';
import { CountedRuleTester } from './support/counted-rule-tester.mjs';

const ruleTester = new CountedRuleTester({
    languageOptions: { parser: tsParser, parserOptions: { sourceType: 'module' } },
});
const FILE = 'packages/shell/src/components/group-grid/GroupGrid.tsx';

describe('the rule that a component file declares no hook and no function', () => {
    it('lets a component, its satellites, their props and what they are drawn with stand', () => {
        ruleTester.run('component-file-holds-components', componentFileHoldsComponents, {
            valid: [
                {
                    code: [
                        "import { createContext, lazy, memo } from 'react';",
                        "const ROOT = 'flex min-h-0';",
                        "const TONES = { info: 'text-muted', warning: 'text-warning' };",
                        'const MIN_GROUP = 120;',
                        'const Scope = createContext(null);',
                        'type Tone = keyof typeof TONES;',
                        'type GroupGridProps = { id: string; tone: Tone };',
                        'type BlankProps = { id: string };',
                        'function Blank(props: BlankProps) { return null; }',
                        'export function GroupGrid(props: GroupGridProps) { return null; }',
                        'export const Row = memo(function Row() { return null; });',
                        "const Editor = lazy(() => import('./Editor.js'));",
                    ].join('\n'),
                    filename: FILE,
                },
                {
                    code: "import { Component } from 'react';\nexport class FaultBoundary extends Component {}",
                    filename: 'packages/shell/src/components/fault/FaultBoundary.tsx',
                },
                {
                    code: 'export function usePreferences() {}\nfunction readPreferences() {}',
                    filename: 'packages/prefs/src/preferences-context.tsx',
                },
            ],
            invalid: [
                {
                    code: 'function useDrawnGrid() {}\nexport function GroupGrid() { return null; }',
                    filename: FILE,
                    errors: [{ messageId: 'hook', data: { name: 'useDrawnGrid' } }],
                },
                {
                    code: [
                        'export function titleOf() {}',
                        'const isOpen = (id: string) => id.length > 0;',
                        'const walk = function () {};',
                        'export function GroupGrid() { return null; }',
                    ].join('\n'),
                    filename: FILE,
                    errors: [
                        { messageId: 'function', data: { name: 'titleOf' } },
                        { messageId: 'function', data: { name: 'isOpen' } },
                        { messageId: 'function', data: { name: 'walk' } },
                    ],
                },
            ],
        });
    });
});
