import { describe, expect, it } from 'vitest';

import { collectionFilePlace } from '../../src/collection/collection-file-place.js';

describe('what a file of the collection directory is', () => {
    it('reads an item from its file, without the extension', () => {
        expect(collectionFilePlace('login.yaml')).toEqual({ kind: 'item', path: 'login' });
        expect(collectionFilePlace('api/pedidos/alta.yaml')).toEqual({
            kind: 'item',
            path: 'api/pedidos/alta',
        });
    });

    it('reads the settings of a collection and of a folder as the group they describe', () => {
        expect(collectionFilePlace('api/collection.yaml')).toEqual({ kind: 'folder', path: 'api' });
        expect(collectionFilePlace('api/pedidos/folder.yaml')).toEqual({
            kind: 'folder',
            path: 'api/pedidos',
        });
    });

    it('names nothing for the root file, a settings file at the wrong level, or another file', () => {
        expect(collectionFilePlace('collections.yaml')).toBeNull();
        expect(collectionFilePlace('api/folder.yaml')).toBeNull();
        expect(collectionFilePlace('api/pedidos/collection.yaml')).toBeNull();
        expect(collectionFilePlace('api/notes.md')).toBeNull();
    });
});
