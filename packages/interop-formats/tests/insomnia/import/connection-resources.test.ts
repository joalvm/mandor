import { describe, expect, it } from 'vitest';

import { connectionResourcesOf } from '../../../src/insomnia/import/connection-resources.js';
import { documentNode, folderNode, websocketNode } from '../support/trees.js';

describe('connectionResourcesOf', () => {
    it('makes a connection of each WebSocket request, wherever it hangs from', () => {
        const resources = connectionResourcesOf([
            documentNode({
                children: [
                    websocketNode({ name: 'Lobby' }),
                    folderNode({ children: [websocketNode({ name: 'Room' })] }),
                ],
            }),
        ]);

        expect(resources.map((each) => [each.place, each.route, each.name])).toEqual([
            ['connection', 'lobby', 'Lobby'],
            ['connection', 'room', 'Room'],
        ]);
    });

    it('keeps two of the same name apart, even when they come from two collections', () => {
        const resources = connectionResourcesOf([
            documentNode({ sourceId: 'workspace:a', children: [websocketNode({ name: 'Chat' })] }),
            documentNode({ sourceId: 'workspace:b', children: [websocketNode({ name: 'Chat' })] }),
        ]);

        expect(resources.map((each) => each.route)).toEqual(['chat', 'chat-2']);
        expect(resources.map((each) => each.origin.sourceId)).toEqual([
            'workspace:a',
            'workspace:b',
        ]);
    });

    it('calls a WebSocket request with no name by the word of its kind', () => {
        const [resource] = connectionResourcesOf([
            documentNode({ children: [websocketNode({ name: '' })] }),
        ]);

        expect(resource).toMatchObject({ route: 'websocket', name: 'WebSocket' });
    });

    it('makes nothing of a document with no WebSocket request', () => {
        expect(connectionResourcesOf([documentNode()])).toEqual([]);
    });
});
