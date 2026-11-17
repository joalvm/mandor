import { describe, expect, it } from 'vitest';

import { FormatError, parseFolderSettings } from '../../src/index.js';

describe('parsing the file of a collection', () => {
    it('reads the name, the order somebody chose and the words the document said', () => {
        const collection = parseFolderSettings({
            name: 'Swagger Petstore',
            order: ['pedidos'],
            description: 'One collection per document',
        });

        expect(collection).toEqual({
            name: 'Swagger Petstore',
            order: ['pedidos'],
            description: 'One collection per document',
        });
    });

    it('treats a collection without an order as one that never got one', () => {
        expect(parseFolderSettings({ name: 'Petstore' }).order).toEqual([]);
    });

    it('keeps the auth of the collection when the file is read and written again', () => {
        const auth = { type: 'basic', username: 'u', password: 'p' };

        const collection = parseFolderSettings({ name: 'Petstore', auth });

        expect(collection.auth).toEqual(auth);
        expect(parseFolderSettings(collection)).toEqual(collection);
    });

    it('refuses an order that is not made of slugs', () => {
        expect(() => parseFolderSettings({ name: 'Petstore', order: ['Pedidos'] })).toThrow(
            FormatError,
        );
    });
});
