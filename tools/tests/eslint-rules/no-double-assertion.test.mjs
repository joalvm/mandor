import tsParser from '@typescript-eslint/parser';
import { describe, it } from 'vitest';

import { noDoubleAssertion } from '../../eslint-rules/no-double-assertion.js';
import { CountedRuleTester } from './support/counted-rule-tester.mjs';

const ruleTester = new CountedRuleTester({
    languageOptions: { parser: tsParser, parserOptions: { sourceType: 'module' } },
});

describe('the double assertion rule', () => {
    it('lets a value be asserted once and refuses an assertion through another type', () => {
        ruleTester.run('no-double-assertion', noDoubleAssertion, {
            valid: [
                { code: "const kind = value as 'message';" },
                { code: 'const list = [] as string[];' },
                { code: 'const fixed = { id: 1 } as const;' },
                { code: 'const read = (outer as Outer).inner as Inner;' },
            ],
            invalid: [
                {
                    code: 'const window = { id: 1 } as unknown as BrowserWindow;',
                    errors: [{ messageId: 'double' }],
                },
                {
                    code: 'const api = (panel as any) as DockviewApi;',
                    errors: [{ messageId: 'double' }],
                },
                {
                    code: 'const event = <KeyboardEvent>(<unknown>{ key: "a" });',
                    errors: [{ messageId: 'double' }],
                },
                {
                    code: 'const typed = <Typed>(value as unknown);',
                    errors: [{ messageId: 'double' }],
                },
            ],
        });
    });
});
