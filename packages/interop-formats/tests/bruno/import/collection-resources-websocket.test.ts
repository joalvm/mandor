import { importResourceSchema } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { collectionResourcesOf } from '../../../src/bruno/import/collection-resources.js';
import { documentNode, folderNode, websocketNode } from '../support/trees.js';

describe('collectionResourcesOf: a WebSocket request', () => {
    it('turns the messages of a WebSocket request into messages where it hung, and no connection', () => {
        const saved = [{ title: 'Hola', type: 'text', data: 'hola' }];
        const resources = collectionResourcesOf(
            documentNode({
                children: [
                    websocketNode({ name: 'Raíz', messages: saved }),
                    folderNode({
                        name: 'Vivo',
                        children: [websocketNode({ name: 'Feed', messages: saved })],
                    }),
                ],
            }),
        );

        expect(resources.map((each) => `${each.place}:${each.route}`)).toEqual([
            'collection:tienda',
            'item:tienda/raiz-hola',
            'folder:tienda/vivo',
            'item:tienda/vivo/feed-hola',
        ]);
        expect(resources.every((each) => importResourceSchema.safeParse(each).success)).toBe(true);
    });

    it('leaves nothing of a WebSocket request that keeps no message', () => {
        const resources = collectionResourcesOf(documentNode({ children: [websocketNode()] }));

        expect(resources.map((each) => each.place)).toEqual(['collection']);
    });
});
