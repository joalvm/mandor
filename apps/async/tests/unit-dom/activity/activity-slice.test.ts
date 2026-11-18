import { describe, expect, it } from 'vitest';

import { initialActivitySlice } from '../../../src/renderer/activity/activity.slice.js';

describe('the starting point of the activity slice', () => {
    it('holds no timeline and no narrowing', () => {
        expect(initialActivitySlice()).toEqual({ entries: {}, narrowings: {} });
    });

    /** A store born from a shared object would leak what one origin fed into the next. */
    it('hands out a fresh slice each time', () => {
        const first = initialActivitySlice();
        const second = initialActivitySlice();

        first.entries['mandor://demo/payments/connection/alpha'] = [];

        expect(second.entries).toEqual({});
        expect(first).not.toBe(second);
    });
});
