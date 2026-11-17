import { describe, expect, it } from 'vitest';

import { collectionSettingsWriteRequestSchema } from '../../src/collection/collection-settings-write.js';

const HOST = { name: 'host', value: 'api.local', enabled: true, secret: false };

describe('the write of the settings of a folder', () => {
    it('takes the words and the variables of a place, emptied ones included', () => {
        const request = {
            workspaceId: 'pagos',
            path: 'api/altas',
            patch: { description: null, variables: [HOST] },
        };

        expect(collectionSettingsWriteRequestSchema.parse(request)).toEqual(request);
    });

    it('takes the auth and the headers of a place, and null to inherit or to empty them', () => {
        const filled = {
            workspaceId: 'pagos',
            path: 'api/altas',
            patch: {
                auth: { type: 'bearer', token: '{{token}}' },
                headers: [{ key: 'X-Team', value: 'a', enabled: true }],
            },
        };
        const emptied = { ...filled, patch: { auth: null, headers: null } };

        expect(collectionSettingsWriteRequestSchema.parse(filled)).toEqual(filled);
        expect(collectionSettingsWriteRequestSchema.parse(emptied)).toEqual(emptied);
    });

    it('refuses an auth of no known type and a header line without a value', () => {
        const base = { workspaceId: 'pagos', path: 'api' };

        expect(
            collectionSettingsWriteRequestSchema.safeParse({
                ...base,
                patch: { auth: { type: 'kerberos' } },
            }).success,
        ).toBe(false);
        expect(
            collectionSettingsWriteRequestSchema.safeParse({
                ...base,
                patch: { headers: [{ key: 'X-Team' }] },
            }).success,
        ).toBe(false);
    });

    it('refuses a key the window does not edit, a secret, and a path out of the tree', () => {
        const base = { workspaceId: 'pagos', path: 'api' };

        expect(
            collectionSettingsWriteRequestSchema.safeParse({ ...base, patch: { name: 'X' } })
                .success,
        ).toBe(false);
        expect(
            collectionSettingsWriteRequestSchema.safeParse({
                ...base,
                patch: { variables: [{ ...HOST, secret: true }] },
            }).success,
        ).toBe(false);
        expect(
            collectionSettingsWriteRequestSchema.safeParse({ ...base, path: '../x', patch: {} })
                .success,
        ).toBe(false);
    });
});
