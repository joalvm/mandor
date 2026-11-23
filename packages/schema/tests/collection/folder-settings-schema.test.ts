import { describe, expect, it } from 'vitest';

import { folderChainLevelSchema } from '../../src/collection/folder-chain-level-schema.js';
import { folderSettingsSchema } from '../../src/collection/folder-settings-schema.js';

describe('the settings of a collection or a folder', () => {
    it('reads the file of one collection with everything an import or a hand wrote', () => {
        const file = folderSettingsSchema.parse({
            name: 'Pagos',
            order: ['cobros'],
            auth: { type: 'bearer', token: '{{token}}' },
            description: 'Lo que el banco cobra',
            importOrigin: { kind: 'postman', sourceId: 'coleccion@1' },
        });

        expect(file.name).toBe('Pagos');
        expect(file.order).toEqual(['cobros']);
        expect(file.auth).toEqual({ type: 'bearer', token: '{{token}}' });
        expect(file.description).toBe('Lo que el banco cobra');
        expect(file.importOrigin).toEqual({ kind: 'postman', sourceId: 'coleccion@1' });
    });

    it('refuses a group file with no name and one whose name is empty', () => {
        expect(() => folderSettingsSchema.parse({})).toThrow();
        expect(() => folderSettingsSchema.parse({ name: '' })).toThrow();
    });

    it('reads a file that still keeps the scripts of an older import apart, and leaves them out', () => {
        const file = folderSettingsSchema.parse({
            name: 'Pagos',
            importedScripts: [{ event: 'onResponse', dialect: 'postman', source: 'pm.test()' }],
        });

        expect(file).toEqual({ name: 'Pagos' });
    });
});

describe('the variables of a collection or a folder', () => {
    it('reads plain variables a hand wrote', () => {
        const file = folderSettingsSchema.parse({
            name: 'Pagos',
            variables: [{ name: 'host', value: 'api.local', enabled: true, secret: false }],
        });

        expect(file.variables).toEqual([
            { name: 'host', value: 'api.local', enabled: true, secret: false },
        ]);
    });

    it('refuses a secret: the file goes to git', () => {
        expect(
            folderSettingsSchema.safeParse({
                name: 'Pagos',
                variables: [{ name: 'token', value: 'x', enabled: true, secret: true }],
            }).success,
        ).toBe(false);
    });
});

describe('the headers of a collection or a folder', () => {
    it('reads lines with the shape of a request, repeated and disabled ones included', () => {
        const headers = [
            { key: 'Accept', value: 'application/json', enabled: true },
            { key: 'Accept', value: 'text/plain', enabled: true },
            { key: 'X-Team', value: '{{team}}', enabled: false },
        ];

        expect(folderSettingsSchema.parse({ name: 'Pagos', headers }).headers).toEqual(headers);
    });

    it('refuses a line without a value', () => {
        expect(
            folderSettingsSchema.safeParse({ name: 'Pagos', headers: [{ key: 'Accept' }] }).success,
        ).toBe(false);
    });
});

describe('a level of the chain on its way to the window', () => {
    it('carries the settings of the level and nothing else', () => {
        const level = {
            level: 'folder',
            place: { kind: 'folder', path: 'pagos/altas' },
            name: 'Altas',
            settings: { variables: [{ name: 'a', value: '1', enabled: true, secret: false }] },
        };

        expect(folderChainLevelSchema.parse(level)).toEqual(level);
        expect(folderChainLevelSchema.safeParse({ ...level, path: '/abs' }).success).toBe(false);
    });
});
