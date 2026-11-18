import { describe, expect, it } from 'vitest';

import { windowPopupMenuRequestSchema } from '../../src/index.js';

describe('window:popup-menu payload', () => {
    it('accepts the corner of the button the menu opens from', () => {
        const parsed = windowPopupMenuRequestSchema.parse({ x: 12, y: 39.5 });

        expect(parsed.x).toBe(12);
        expect(parsed.y).toBe(39.5);
    });

    it('rejects a payload that carries anything but the corner', () => {
        const result = windowPopupMenuRequestSchema.safeParse({ x: 12, y: 39, windowId: 7 });

        expect(result.success).toBe(false);
    });
});
