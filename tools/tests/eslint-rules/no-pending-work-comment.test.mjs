import { describe, it } from 'vitest';

import { noPendingWorkComment } from '../../eslint-rules/no-pending-work-comment.js';
import { CountedRuleTester } from './support/counted-rule-tester.mjs';

const ruleTester = new CountedRuleTester();

describe('the pending work comment rule', () => {
    it('lets ordinary prose through, however it spells the words', () => {
        ruleTester.run('no-pending-work-comment', noPendingWorkComment, {
            valid: [
                { code: '// todo archivo nuevo nace con su test\nconst a = 1;' },
                { code: '/* Todo lo que entra se valida */\nconst a = 1;' },
                { code: '// a hack-free path, and a fixme-less one\nconst a = 1;' },
                { code: "const todo = 'TODO is a string, not a comment';" },
            ],
            invalid: [
                { code: '// TODO: cache this\nconst a = 1;', errors: [{ messageId: 'pending' }] },
                { code: '/* FIXME later */\nconst a = 1;', errors: [{ messageId: 'pending' }] },
                { code: 'const a = 1; // XXX', errors: [{ messageId: 'pending' }] },
                {
                    code: '/**\n * Slow on purpose. HACK until the store moves.\n */\nconst a = 1;',
                    errors: [{ messageId: 'pending' }],
                },
                {
                    code: '// TODO one\n// FIXME two\nconst a = 1;',
                    errors: [{ messageId: 'pending' }, { messageId: 'pending' }],
                },
            ],
        });
    });
});
