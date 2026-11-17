import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

import { readV4 } from '../../../src/insomnia/document/read-v4.js';
import { readV5 } from '../../../src/insomnia/document/read-v5.js';
import { fixtureJson, fixtureText } from '../support/fixture.js';

describe('reading WebSocket requests', () => {
    it('tells a v5 item by the prefix of its id, since it has neither children nor a method', () => {
        const [document] = readV5(parse(fixtureText('websockets-v5.yaml')));

        expect(document?.children.map((node) => `${node.kind}:${node.name}`)).toEqual([
            'websocket:localhost:4010',
            'websocket:basic-auth',
            'websocket:bearer',
            'websocket:redirect',
            'websocket:delay',
            'websocket:path-param',
        ]);
        expect(document?.skipped).toEqual([]);
    });

    it('reads the address, the headers, the auth and the path parameters of a v5 item', () => {
        const [document] = readV5(parse(fixtureText('websockets-v5.yaml')));
        const nodes = document?.children ?? [];

        expect(nodes[4]).toMatchObject({ headers: [{ name: 'duration', value: '5' }] });
        expect(nodes[1]).toMatchObject({ authentication: { type: 'basic', username: 'user' } });
        expect(nodes[5]).toMatchObject({
            url: 'ws://localhost:4010/chat/:id',
            pathParameters: [{ name: 'id', value: '1234' }],
        });
    });

    it('leaves a v5 item with no id of a WebSocket out, named', () => {
        const [document] = readV5({
            type: 'collection.insomnia.rest/5.0',
            name: 'Mixed',
            collection: [{ name: 'Events', url: 'http://x', meta: { id: 'socketio-req_1' } }],
        });

        expect(document?.children).toEqual([]);
        expect(document?.skipped).toEqual([{ kind: 'item', name: 'Events' }]);
    });

    it('reads a v4 websocket_request in its place of the tree, and no saved payload', () => {
        const [document] = readV4(fixtureJson('websockets-v4.json'));
        const [rooms, lobby, health] = document?.children ?? [];

        expect(rooms).toMatchObject({
            kind: 'folder',
            children: [{ kind: 'websocket', name: 'Room', pathParameters: [{ name: 'id' }] }],
        });
        expect(lobby).toMatchObject({
            kind: 'websocket',
            name: 'Lobby',
            description: 'The public room',
            parameters: [{ name: 'room', value: '1' }],
        });
        expect(health).toMatchObject({ kind: 'request', name: 'Health' });
    });

    it('names the Socket.IO request of a v4 export as left out', () => {
        const [document] = readV4(fixtureJson('websockets-v4.json'));

        expect(document?.skipped).toEqual([{ kind: 'socketio_request', name: 'Events' }]);
    });
});
