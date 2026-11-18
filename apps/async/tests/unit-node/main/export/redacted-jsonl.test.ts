import { afterEach, describe, expect, it } from 'vitest';

import { redactedJsonl } from '../../../../src/main/export/redacted-jsonl.js';
import { rememberSessionSecrets } from '@mandor/host';
import { forgetSecrets } from '@mandor/host/testing';

afterEach(() => {
    forgetSecrets();
});

describe('the jsonl of a batch of records', () => {
    it('writes one line per record, each one whole', () => {
        const text = redactedJsonl([{ text: 'first' }, { text: 'second' }]);

        expect(text.split('\n').filter((line) => line !== '')).toEqual([
            '{"text":"first"}',
            '{"text":"second"}',
        ]);
    });

    /** A file that grows a record at a time ends every line, including the last one. */
    it('ends the last line too', () => {
        expect(redactedJsonl([{ text: 'only' }]).endsWith('\n')).toBe(true);
    });

    it('gives back nothing at all for no records', () => {
        expect(redactedJsonl([])).toBe('');
    });

    it('hides the secrets of the session however deep they sit', () => {
        rememberSessionSecrets(['tok_abcdefgh']);

        const text = redactedJsonl([
            { headers: { Authorization: 'Bearer tok_abcdefgh' } },
            { text: 'nothing to hide' },
        ]);

        expect(text).not.toContain('tok_abcdefgh');
        expect(text).toContain('[redacted]');
        expect(text).toContain('nothing to hide');
    });
});
