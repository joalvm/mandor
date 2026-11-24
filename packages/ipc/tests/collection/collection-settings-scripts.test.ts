import { describe, expect, it } from 'vitest';

import { collectionSettingsWriteRequestSchema } from '../../src/collection/collection-settings-write.js';

const BASE = { workspaceId: 'pagos', path: 'api/altas' };

describe('the write of the scripts of a folder', () => {
    it('takes the scripts of a place and null to empty them', () => {
        const filled = {
            ...BASE,
            patch: { scripts: { onBeforeRequest: { source: 'a()', enabled: false } } },
        };
        const emptied = { ...BASE, patch: { scripts: null } };

        expect(collectionSettingsWriteRequestSchema.parse(filled)).toEqual(filled);
        expect(collectionSettingsWriteRequestSchema.parse(emptied)).toEqual(emptied);
    });

    it('refuses a script with no text', () => {
        expect(
            collectionSettingsWriteRequestSchema.safeParse({
                ...BASE,
                patch: { scripts: { onResponse: {} } },
            }).success,
        ).toBe(false);
    });

    it('refuses the key an older import kept its scripts under: they live in their moment', () => {
        expect(
            collectionSettingsWriteRequestSchema.safeParse({
                ...BASE,
                patch: { importedScripts: null },
            }).success,
        ).toBe(false);
    });
});
