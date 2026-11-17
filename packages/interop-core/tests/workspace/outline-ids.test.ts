import type { Connection, Environment } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import {
    collectionId,
    connectionId,
    docId,
    environmentId,
    folderId,
    itemId,
    SETTINGS_ID,
} from '../../src/workspace/outline-ids.js';

describe('the routes of an outline', () => {
    it('name a place in the workspace data by what holds it', () => {
        expect(connectionId({ id: 'produccion' } as Connection)).toBe('connection/produccion');
        expect(environmentId({ id: 'staging' } as Environment)).toBe('environment/staging');
        expect(docId({ name: 'leeme.md', title: 'Leeme', text: '' })).toBe('doc/leeme.md');
        expect(SETTINGS_ID).toBe('settings');
    });

    it('go down from the collection to the folder and the item by their position', () => {
        const collection = collectionId(2);
        const folder = folderId(collection, 1);

        expect([collection, folder, itemId(folder, 0)]).toEqual([
            'collection/2',
            'collection/2/folder/1',
            'collection/2/folder/1/item/0',
        ]);
    });
});
