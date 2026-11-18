import { describe, it } from 'vitest';

import { noKindBranch } from '../../eslint-rules/no-kind-branch.js';
import { CountedRuleTester } from './support/counted-rule-tester.mjs';

const ruleTester = new CountedRuleTester();

describe('the kind branch rule', () => {
    it('lets a table choose and a lone question be asked, and refuses every way of walking the kinds', () => {
        ruleTester.run('no-kind-branch', noKindBranch, {
            valid: [
                { code: 'const write = WRITERS[place.kind];' },
                {
                    code: 'function text(body) {\n if (body === undefined) { return null; }\n return body.text;\n}',
                },
                {
                    code: "if (typeof value === 'string') { a(); }\nif (typeof value === 'number') { b(); }",
                },
                { code: "if (kind === 'a') { a(); }\nif (other === 'b') { b(); }" },
                { code: "if (kind === 'a') { a(); }\nif (kind === 'a') { again(); }" },
                { code: 'if (body === null) { a(); }\nif (body === undefined) { b(); }' },
                { code: "const same = kind === 'a';" },
                { code: "const label = count === 0 ? 'none' : 'some';" },
                { code: "const route = parent === '' ? slug : `${parent}/${slug}`;" },
                { code: "if (protocol !== 'ws' && protocol !== 'wss') { reject(); }" },
            ],
            invalid: [
                {
                    code: "switch (kind) { case 'a': run(); break; default: stop(); }",
                    errors: [{ messageId: 'switchBranch' }],
                },
                {
                    code: "if (kind === 'a') { a(); } else if (kind === 'b') { b(); }",
                    errors: [{ messageId: 'elseIfBranch' }],
                },
                {
                    code: "function pick(kind) {\n if (kind === 'a') { return 1; }\n if (kind === 'b') { return 2; }\n return 3;\n}",
                    errors: [{ messageId: 'ifSeries' }],
                },
                {
                    code: 'if (count === 0 || size === 1) { a(); }\nif (size === 2) { b(); }',
                    errors: [{ messageId: 'ifSeries' }],
                },
                {
                    code: "const name = kind === 'a' ? 'A' : 'B';",
                    errors: [{ messageId: 'ternaryBranch' }],
                },
            ],
        });
    });
});
