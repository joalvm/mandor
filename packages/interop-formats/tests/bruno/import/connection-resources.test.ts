import { describe, expect, it } from 'vitest';

import { connectionResourcesOf } from '../../../src/bruno/import/connection-resources.js';
import { documentNode, folderNode, requestNode, websocketNode } from '../support/trees.js';

describe('connectionResourcesOf', () => {
    it('writes one connection for each WebSocket request, in the folders as much as at the root', () => {
        const resources = connectionResourcesOf([
            documentNode({
                children: [
                    websocketNode({ name: 'Raíz' }),
                    requestNode({ name: 'Lista' }),
                    folderNode({
                        children: [
                            websocketNode({ name: 'Dentro' }),
                            folderNode({ children: [websocketNode({ name: 'Más dentro' })] }),
                        ],
                    }),
                ],
            }),
        ]);

        expect(resources.map((each) => [each.place, each.name, each.route])).toEqual([
            ['connection', 'Raíz', 'raiz'],
            ['connection', 'Dentro', 'dentro'],
            ['connection', 'Más dentro', 'mas-dentro'],
        ]);
    });

    it('keeps the connections of two collections that call theirs the same apart', () => {
        const resources = connectionResourcesOf([
            documentNode({ sourceId: 'collection:a', children: [websocketNode({ name: 'Feed' })] }),
            documentNode({ sourceId: 'collection:b', children: [websocketNode({ name: 'Feed' })] }),
        ]);

        expect(resources.map((each) => [each.route, each.origin.sourceId])).toEqual([
            ['feed', 'collection:a'],
            ['feed-2', 'collection:b'],
        ]);
    });

    it('calls a request that has no name by the word for what it is', () => {
        const [resource] = connectionResourcesOf([
            documentNode({ children: [websocketNode({ name: ' ' })] }),
        ]);

        expect(resource).toMatchObject({ name: 'WebSocket', route: 'websocket' });
    });

    it('writes nothing for a collection with no WebSocket request', () => {
        expect(connectionResourcesOf([documentNode({ children: [requestNode()] })])).toEqual([]);
    });
});
