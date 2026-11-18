import { describe, expect, it } from 'vitest';

import { isLive } from '../../../../src/renderer/features/connections/lib/live-state.js';

describe('isLive', () => {
    it('counts an open socket and one still dialling as live', () => {
        expect(isLive('open')).toBe(true);
        expect(isLive('connecting')).toBe(true);
    });

    it('counts the quiet faces as not live', () => {
        expect(isLive('idle')).toBe(false);
        expect(isLive('closing')).toBe(false);
        expect(isLive('closed')).toBe(false);
        expect(isLive('error')).toBe(false);
    });
});
