import { describe, expect, it } from 'vitest';

import { windowMinimizeRequestSchema } from '../../src/window/window-minimize.js';

describe('windowMinimizeRequestSchema', () => {
    it('has no parameters: the window is the one that sent the message', () => {
        expect(windowMinimizeRequestSchema.parse({})).toEqual({});
    });

    it('refuses a renderer that tries to name another window', () => {
        expect(windowMinimizeRequestSchema.safeParse({ windowId: 2 }).success).toBe(false);
    });
});
