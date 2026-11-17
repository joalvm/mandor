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

    it('takes the scripts an import brought, and null once the person moved the last one', () => {
        const kept = {
            ...BASE,
            patch: {
                importedScripts: [{ event: 'onResponse', dialect: 'postman', source: 'pm.x()' }],
            },
        };
        const moved = { ...BASE, patch: { importedScripts: null } };

        expect(collectionSettingsWriteRequestSchema.parse(kept)).toEqual(kept);
        expect(collectionSettingsWriteRequestSchema.parse(moved)).toEqual(moved);
    });

    it('refuses an imported script of a tool it does not know', () => {
        expect(
            collectionSettingsWriteRequestSchema.safeParse({
                ...BASE,
                patch: { importedScripts: [{ event: 'onResponse', dialect: 'x', source: '' }] },
            }).success,
        ).toBe(false);
    });
});
