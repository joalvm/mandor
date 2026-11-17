import { describe, expect, it } from 'vitest';

import { FormatError, parseFolderSettings } from '../../src/index.js';

describe('parsing a folder', () => {
    it('reads the visible name and the order somebody chose', () => {
        const folder = parseFolderSettings({
            name: 'Pedidos',
            order: ['pedido-creado', 'pedido-pagado'],
        });

        expect(folder).toEqual({ name: 'Pedidos', order: ['pedido-creado', 'pedido-pagado'] });
    });

    it('treats a folder without an order as a folder that never got one', () => {
        expect(parseFolderSettings({ name: 'Pedidos' }).order).toEqual([]);
    });

    it('keeps the auth of the folder when the file is read and written again', () => {
        const auth = { type: 'basic', username: 'u', password: 'p' };

        const folder = parseFolderSettings({ name: 'Pedidos', auth });

        expect(folder.auth).toEqual(auth);
        expect(parseFolderSettings(folder)).toEqual(folder);
    });

    it('reads inherit as the folder deferring upward, and keeps it on rewrite', () => {
        const folder = parseFolderSettings({ name: 'Pedidos', auth: { inherit: true } });

        expect(folder.auth).toEqual({ inherit: true });
        expect(parseFolderSettings(folder)).toEqual(folder);
    });

    it('keeps what an import wrote in the folder when the file is read and written again', () => {
        const input = {
            name: 'Pedidos',
            auth: { type: 'bearer', token: '{{token}}' },
            importOrigin: { kind: 'postman', sourceId: 'collection:1', fingerprint: 'abc' },
            importedScripts: [{ event: 'onResponse', dialect: 'postman', source: 'pm.test()' }],
        };

        const folder = parseFolderSettings(input);

        expect(folder).toMatchObject(input);
        expect(parseFolderSettings(folder)).toEqual(folder);
    });

    it('refuses an order naming something that is not one path segment', () => {
        expect(() => parseFolderSettings({ name: 'Pedidos', order: ['../x'] })).toThrow(
            FormatError,
        );
    });

    it('refuses a folder with no visible name', () => {
        expect(() => parseFolderSettings({ order: [] })).toThrow(FormatError);
    });
});
