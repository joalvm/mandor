import { describe, expect, it } from 'vitest';

import { appRelaunchRequestSchema } from '../../src/window/app-relaunch.js';

describe('the request to start the app over', () => {
    it('carries nothing', () => {
        expect(appRelaunchRequestSchema.safeParse({}).success).toBe(true);
    });

    it('refuses anything the window adds to it', () => {
        expect(appRelaunchRequestSchema.safeParse({ force: true }).success).toBe(false);
    });
});
