import { describe, expect, it } from 'vitest';

import { websocketOfBru } from '../../../src/bruno/document/read-bru-websocket.js';
import { rowOf, websocketNode } from '../support/trees.js';

describe('websocketOfBru', () => {
    it('reads the address, the headers, the auth and the notes of a request', () => {
        const socket = websocketOfBru(
            {
                meta: { name: 'ignored', type: 'ws', seq: '4' },
                ws: { url: 'wss://api.test/live', auth: 'bearer' },
                headers: [
                    { name: 'X-Token', value: '1', enabled: true },
                    { name: 'X-Off', value: '2', enabled: false },
                ],
                auth: { bearer: { token: 't' } },
                docs: 'Una nota',
            },
            'Live',
        );

        expect(socket).toEqual(
            websocketNode({
                name: 'Live',
                seq: 4,
                url: 'wss://api.test/live',
                description: 'Una nota',
                headers: [rowOf('X-Token', '1'), rowOf('X-Off', '2', { disabled: true })],
                auth: { type: 'bearer', token: 't' },
            }),
        );
    });

    it('reads each message the body keeps, typed the way the file types it', () => {
        const socket = websocketOfBru(
            {
                body: {
                    ws: [
                        { name: 'Hola', type: 'json', content: '{}', selected: true },
                        { content: 'x' },
                        {},
                    ],
                },
            },
            'Live',
        );

        expect(socket.messages).toEqual([
            { title: 'Hola', type: 'json', data: '{}' },
            { title: '', type: 'text', data: 'x' },
            { title: '', type: 'text', data: '' },
        ]);
    });

    it('is a request with nothing in it when the file says nothing', () => {
        expect(websocketOfBru({}, 'Live')).toEqual(
            websocketNode({ name: 'Live', seq: Number.MAX_SAFE_INTEGER, url: '' }),
        );
    });

    it('names what the request keeps that Mandor has no place for', () => {
        const socket = websocketOfBru(
            {
                meta: { tags: ['live'] },
                ws: { url: 'wss://a' },
                script: { req: 'x()' },
                tests: 'test(1)',
                vars: { req: [{ name: 'a', value: '1', enabled: true }] },
            },
            'Live',
        );

        expect(socket.leftOut).toEqual(['scripts', 'tests', 'request variables', 'tags']);
    });
});
