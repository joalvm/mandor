import { describe, expect, it } from 'vitest';

import { windowToggleMaximizeRequestSchema } from '../../src/window/window-toggle-maximize.js';

describe('windowToggleMaximizeRequestSchema', () => {
    it('asks for both directions with the same empty message', () => {
        expect(windowToggleMaximizeRequestSchema.parse({})).toEqual({});
    });

    it('refuses a renderer that says which direction: it has no state to argue with', () => {
        expect(windowToggleMaximizeRequestSchema.safeParse({ maximized: true }).success).toBe(
            false,
        );
    });
});
