import { describe, expect, it } from 'vitest';

import { lspTextOf } from '../../src/editor/lsp-text.js';

describe('the words of a language service answer', () => {
    it('are the string it gave', () => {
        expect(lspTextOf('Syntax Error')).toBe('Syntax Error');
    });

    it('are the value of the markup it wrapped them in', () => {
        expect(lspTextOf({ value: 'Unknown field' })).toBe('Unknown field');
    });
});
