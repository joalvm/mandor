import { describe, expect, it } from 'vitest';

import { appOpenLicensesRequestSchema } from '../../src/app/app-open-licenses.js';

describe('the request to show the licenses', () => {
    it('carries nothing', () => {
        expect(appOpenLicensesRequestSchema.safeParse({}).success).toBe(true);
    });

    it('refuses a path the window tries to name', () => {
        expect(appOpenLicensesRequestSchema.safeParse({ path: 'C:/Windows' }).success).toBe(false);
    });
});
