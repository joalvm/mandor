import { describe, expect, it } from 'vitest';

import { windowMaximizedPushSchema } from '../../src/index.js';

describe('window:maximized push', () => {
    it('carries the one bit the maximize icon needs', () => {
        expect(windowMaximizedPushSchema.parse({ maximized: true })).toEqual({ maximized: true });
    });

    it('refuses a push that says anything else', () => {
        const result = windowMaximizedPushSchema.safeParse({ maximized: 'yes' });

        expect(result.success).toBe(false);
    });
});
