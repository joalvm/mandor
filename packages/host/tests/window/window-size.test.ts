import { describe, expect, it } from 'vitest';

import { WINDOW_SIZE } from '../../src/window/window-size.js';

describe('the size every Mandor window opens at', () => {
    it('opens at the size the layout measurements were drawn for', () => {
        expect(WINDOW_SIZE.width).toBe(1294);
        expect(WINDOW_SIZE.height).toBe(807);
    });

    it('refuses to shrink below the width the sidebar and both panels need', () => {
        expect(WINDOW_SIZE.minWidth).toBeLessThan(WINDOW_SIZE.width);
        expect(WINDOW_SIZE.minHeight).toBeLessThan(WINDOW_SIZE.height);
        expect(WINDOW_SIZE.minWidth).toBeGreaterThanOrEqual(1024);
        expect(WINDOW_SIZE.minHeight).toBeGreaterThanOrEqual(640);
    });
});
