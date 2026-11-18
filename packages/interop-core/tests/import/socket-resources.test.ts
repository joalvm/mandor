import { describe, expect, it } from 'vitest';

import { socketResources } from '../../src/import/socket-resources.js';
import type { ImportResource } from '../../src/resource/import-resource.js';

type Socket = { name: string; url: string };

function resourceOf(socket: Socket, sourceId: string, route: string): ImportResource {
    return {
        place: 'connection',
        itemKind: null,
        route,
        name: socket.name,
        fields: { url: socket.url },
        origin: { kind: 'bruno', sourceId, fingerprint: 'f' },
        degradations: [],
    };
}

describe('socketResources', () => {
    it('keeps one id per connection across every collection of the import', () => {
        const resources = socketResources(
            [
                { sourceId: 'a', sockets: [{ name: 'Chat', url: 'ws://1' }] },
                { sourceId: 'b', sockets: [{ name: 'Chat', url: 'ws://2' }] },
            ],
            resourceOf,
        );

        expect(resources.map(({ route, origin }) => [route, origin.sourceId])).toEqual([
            ['chat', 'a'],
            ['chat-2', 'b'],
        ]);
    });

    it('calls a socket with no name by the word of what it is', () => {
        const [resource] = socketResources(
            [{ sourceId: 'a', sockets: [{ name: '', url: 'ws://1' }] }],
            resourceOf,
        );

        expect(resource?.name).toBe('WebSocket');
        expect(resource?.route).toBe('websocket');
    });

    it('is empty when no collection holds a socket', () => {
        expect(socketResources([{ sourceId: 'a', sockets: [] }], resourceOf)).toEqual([]);
    });
});
