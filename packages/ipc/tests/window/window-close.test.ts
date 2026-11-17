import { describe, expect, it } from 'vitest';

import { windowCloseRequestSchema } from '../../src/window/window-close.js';

describe('windowCloseRequestSchema', () => {
    it('carries nothing: there is nothing to say about closing the window', () => {
        expect(windowCloseRequestSchema.parse({})).toEqual({});
    });

    it('refuses a renderer that tries to name another window', () => {
        expect(windowCloseRequestSchema.safeParse({ windowId: 2 }).success).toBe(false);
    });
});
