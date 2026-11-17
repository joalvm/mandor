import { describe, expect, it } from 'vitest';

import { windowReadyRequestSchema } from '../../src/window/window-ready.js';

describe('the message that says the window is ready', () => {
    it('carries nothing', () => {
        expect(windowReadyRequestSchema.safeParse({}).success).toBe(true);
    });

    it('refuses anything the window adds to it', () => {
        expect(windowReadyRequestSchema.safeParse({ at: 12 }).success).toBe(false);
    });
});
