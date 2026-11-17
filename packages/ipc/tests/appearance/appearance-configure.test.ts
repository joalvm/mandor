import { describe, expect, it } from 'vitest';

import { appearanceConfigureRequestSchema } from '../../src/appearance/appearance-configure.js';

describe('the request to set the appearance of the system parts', () => {
    it('carries one of the three sources', () => {
        for (const source of ['system', 'light', 'dark']) {
            expect(appearanceConfigureRequestSchema.safeParse({ source }).success).toBe(true);
        }
    });

    it('refuses a source that is not one, a missing one and anything beside it', () => {
        expect(
            appearanceConfigureRequestSchema.safeParse({ source: 'light-contrast' }).success,
        ).toBe(false);
        expect(appearanceConfigureRequestSchema.safeParse({}).success).toBe(false);
        expect(
            appearanceConfigureRequestSchema.safeParse({ source: 'dark', path: 'C:/' }).success,
        ).toBe(false);
    });
});
