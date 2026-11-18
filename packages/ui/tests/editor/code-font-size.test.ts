import { describe, expect, it } from 'vitest';

import { CODE_FONT_SIZE } from '../../src/editor/code-font-size.js';

describe('the size every editor writes code in', () => {
    it('is a whole, readable number of pixels for the editors of the app to count from', () => {
        expect(CODE_FONT_SIZE).toBe(12);
        expect(Number.isInteger(CODE_FONT_SIZE)).toBe(true);
    });
});
