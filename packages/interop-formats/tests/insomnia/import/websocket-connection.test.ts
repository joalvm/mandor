import { degradation, importResourceSchema } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { websocketResourceOf } from '../../../src/insomnia/import/websocket-connection.js';
import { resourceAt, resourcesOfFixture } from '../support/resources.js';
import { rowOf, websocketNode } from '../support/trees.js';

describe('websocketResourceOf', () => {
    it('makes a connection of the address, the headers and the query', () => {
        const resource = websocketResourceOf(
            websocketNode({
                headers: [rowOf('duration', '5'), rowOf('x-off', '1', { disabled: true })],
                parameters: [rowOf('room', '1')],
                description: 'Lobby',
            }),
            'workspace:wrk_1',
            'chat',
        );

        expect(importResourceSchema.safeParse(resource).success).toBe(true);
        expect(resource).toMatchObject({
            place: 'connection',
            route: 'chat',
            origin: { kind: 'insomnia', sourceId: 'workspace:wrk_1' },
            fields: {
                name: 'Chat',
                url: 'ws://localhost:4010/chat',
                transport: 'websocket',
                headers: [
                    { key: 'duration', value: '5', enabled: true },
                    { key: 'x-off', value: '1', enabled: false },
                ],
                params: [{ key: 'room', value: '1', enabled: true }],
                description: 'Lobby',
            },
            degradations: [],
        });
    });

    it('sends a path parameter in the url, since a connection has no place for its value', () => {
        const resource = websocketResourceOf(
            websocketNode({
                url: 'ws://localhost:4010/chat/:id',
                pathParameters: [rowOf('id', '1234')],
            }),
            'workspace:wrk_1',
            'chat',
        );

        expect(resource.fields['url']).toBe('ws://localhost:4010/chat/1234');
    });

    it('reads the references to the variables the way Mandor writes them', () => {
        const resource = websocketResourceOf(
            websocketNode({
                url: 'wss://{{ _.host }}/chat',
                authentication: { type: 'bearer', token: '{{ _.token }}' },
            }),
            'workspace:wrk_1',
            'chat',
        );

        expect(resource.fields).toMatchObject({
            url: 'wss://{{host}}/chat',
            auth: { type: 'bearer', token: '{{token}}' },
        });
        expect(resource.degradations).toEqual([]);
    });

    it('takes a secret written in the document as it came', () => {
        const resource = websocketResourceOf(
            websocketNode({ authentication: { type: 'bearer', token: 'cool-token' } }),
            'workspace:wrk_1',
            'chat',
        );

        expect(resource.degradations).toEqual([]);
    });

    it('says a template of Insomnia it cannot run, since it would stay as text', () => {
        const resource = websocketResourceOf(
            websocketNode({ url: 'ws://localhost/{% uuid %}' }),
            'workspace:wrk_1',
            'chat',
        );

        expect(resource.degradations).toEqual(
            expect.arrayContaining([
                degradation('templateUnsupported', { template: '{% uuid %}' }),
            ]),
        );
    });
});

describe('the WebSocket requests of an Insomnia file', () => {
    it('enter as connections on the id of their name, the collection beside them', async () => {
        const resources = await resourcesOfFixture('websockets-v5.yaml');
        const connections = resources.filter((each) => each.place === 'connection');

        expect(connections.map((each) => each.route)).toEqual([
            'localhost-4010',
            'basic-auth',
            'bearer',
            'redirect',
            'delay',
            'path-param',
        ]);
        expect(resourceAt(resources, 'collection', 'websockets').name).toBe('WebSockets');
        expect(resourceAt(resources, 'connection', 'path-param').fields['url']).toBe(
            'ws://localhost:4010/chat/1234',
        );
    });

    it('takes the credentials the file wrote in plain text as they came', async () => {
        const resources = await resourcesOfFixture('websockets-v5.yaml');
        const connections = resources.filter((each) => each.place === 'connection');

        expect(connections.flatMap((each) => each.degradations)).toEqual([]);
        expect(resourceAt(resources, 'connection', 'bearer').fields['auth']).toMatchObject({
            type: 'bearer',
        });
        expect(resourceAt(resources, 'connection', 'bearer').fields['auth']).not.toMatchObject({
            token: '',
        });
    });

    it('finds a WebSocket request inside a folder and carries what the handshake sends', async () => {
        const resources = await resourcesOfFixture('websockets-v4.json');
        const routes = resources
            .filter((each) => each.place === 'connection')
            .map((each) => each.route);

        expect(routes).toEqual(['lobby', 'room']);
        expect(resourceAt(resources, 'connection', 'lobby').fields).toMatchObject({
            headers: [{ key: 'x-token', value: '{{token}}', enabled: false }],
            websocket: { subprotocols: ['chat', 'superchat'] },
            auth: { type: 'bearer', token: '{{token}}' },
        });
    });

    it('says on the collection the Socket.IO request it leaves out', async () => {
        const resources = await resourcesOfFixture('websockets-v4.json');

        expect(resourceAt(resources, 'collection', 'chat').degradations).toEqual([
            degradation('kindLeftOut', { kind: 'socketio request', name: 'Events' }),
        ]);
    });
});
