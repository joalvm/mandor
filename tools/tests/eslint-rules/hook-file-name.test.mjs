import { describe, it } from 'vitest';

import { hookFileName } from '../../eslint-rules/hook-file-name.js';
import { CountedRuleTester } from './support/counted-rule-tester.mjs';

const ruleTester = new CountedRuleTester();

describe('the hook file name rule', () => {
    it('names a file after the hook it exports', () => {
        ruleTester.run('hook-file-name', hookFileName, {
            valid: [
                {
                    code: 'export function useVariableHover() {}',
                    filename: 'packages/env/src/hooks/useVariableHover.ts',
                },
                {
                    code: 'export const useToast = () => null;',
                    filename: 'packages/ui/src/hooks/useToast.tsx',
                },
                {
                    code: 'export function useDocOpen() {}\nexport function useDocOpenFor() {}',
                    filename: 'packages/docs/src/hooks/useDocOpen.ts',
                },
                {
                    code: 'export function user() {}\nexport function openConnection() {}',
                    filename: 'apps/async/src/renderer/features/connections/lib/open-connection.ts',
                },
                {
                    code: 'function useLocal() {}\nexport function Panel() { useLocal(); }',
                    filename: 'packages/shell/src/components/panel/Panel.tsx',
                },
                {
                    code: 'export const RowNameProvider = null;\nexport function useRowNameId() {}',
                    filename: 'packages/ui/src/components/row/row-name.ts',
                },
            ],
            invalid: [
                {
                    code: 'export function useVariableHover() {}',
                    filename: 'packages/env/src/hooks/use-variable-hover.ts',
                    errors: [{ messageId: 'hookFileName', data: { hook: 'useVariableHover' } }],
                },
                {
                    code: 'export const useImportFlow = () => null;',
                    filename: 'apps/async/src/renderer/features/import/hooks/use-import-flow.ts',
                    errors: [{ messageId: 'hookFileName', data: { hook: 'useImportFlow' } }],
                },
            ],
        });
    });
});
