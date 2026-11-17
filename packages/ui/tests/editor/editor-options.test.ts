import { describe, expect, it } from 'vitest';

import { isReadOnly } from '../../src/editor/editor-options.js';

describe('whether an editor is only read', () => {
    /** Bytes are what arrived: writing them would show a frame that never came. */
    it('only reads bytes, whatever its caller asked', () => {
        expect(isReadOnly('binary', {})).toBe(true);
        expect(isReadOnly('binary', { readOnly: false })).toBe(true);
    });

    it('writes any other text unless its caller asked it not to', () => {
        expect(isReadOnly('jsonc', {})).toBe(false);
        expect(isReadOnly('xml', { readOnly: false })).toBe(false);
        expect(isReadOnly('markdown', { readOnly: true })).toBe(true);
    });
});
