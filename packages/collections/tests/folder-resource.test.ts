import { describe, expect, it } from 'vitest';

import { folderPartsOf, folderResource } from '../src/lib/folder-resource.js';

describe('folderResource', () => {
    it('names one group of the tree by its path, and reads back as it', () => {
        const resource = folderResource('Local APIs', 'events', 'pedidos/altas');

        expect(resource).toBe('mandor://local-apis/events/folder/pedidos/altas');
        expect(folderPartsOf(resource)).toEqual({ path: 'pedidos/altas', workspaceId: 'events' });
    });

    it('reads nothing out of a resource that is not a folder', () => {
        expect(folderPartsOf('mandor://local-apis/events/item/pedidos/x')).toBeNull();
    });
});
