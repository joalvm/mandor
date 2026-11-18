import { describe, expect, it } from 'vitest';

import { opensToken } from '../src/lib/opens-token.js';

describe('opensToken', () => {
    it('opens right after a fresh {{', () => {
        expect(opensToken('a{{', 3)).toBe(true);
    });

    it('does not open when the close is already there', () => {
        expect(opensToken('a{{}}', 3)).toBe(false);
    });

    it('does not open without {{ before the caret, or without a caret', () => {
        expect(opensToken('a{b', 3)).toBe(false);
        expect(opensToken('{{', 1)).toBe(false);
        expect(opensToken('{{', null)).toBe(false);
    });
});
