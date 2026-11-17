import { BODY_WINDOW_BYTES } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { SPILL_BYTES, WINDOW_BYTES } from '../../../../src/main/request/body-limits.js';

describe('the limits of a response body in main', () => {
    it('reads a window as big as the contract allows, no more', () => {
        expect(WINDOW_BYTES).toBe(BODY_WINDOW_BYTES);
    });

    it('spills a body in whole windows, so the first read never cuts a smaller one short', () => {
        expect(SPILL_BYTES % WINDOW_BYTES).toBe(0);
        expect(SPILL_BYTES).toBeGreaterThan(WINDOW_BYTES);
    });
});
