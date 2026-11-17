import { describe, expect, it } from 'vitest';

import { websocketOf } from '../../../src/bruno/document/read-oc-websocket.js';
import { rowOf, websocketNode } from '../support/trees.js';

describe('websocketOf', () => {
    it('is nothing for an item that has no websocket part', () => {
        expect(websocketOf({ info: { name: 'Feed' } }, 'Feed')).toBeUndefined();
        expect(websocketOf({ websocket: null }, 'Feed')).toBeUndefined();
    });

    it('reads the address, the headers, the auth and the notes of a request', () => {
        const socket = websocketOf(
            {
                info: { name: 'ignored', seq: 3 },
                websocket: {
                    url: 'wss://api.test/live',
                    headers: [
                        { name: 'X-Token', value: '1' },
                        { name: 'X-Off', disabled: true },
                    ],
                    auth: { type: 'bearer', token: 't' },
                },
                docs: 'Una nota',
            },
            'Live',
        );

        expect(socket).toEqual(
            websocketNode({
                name: 'Live',
                seq: 3,
                url: 'wss://api.test/live',
                description: 'Una nota',
                headers: [rowOf('X-Token', '1'), rowOf('X-Off', '', { disabled: true })],
                auth: { type: 'bearer', token: 't' },
            }),
        );
    });

    it('reads the one message a request keeps, typed as OpenCollection types it', () => {
        const socket = websocketOf(
            { websocket: { message: { type: 'json', data: '{"a":1}' } } },
            'Live',
        );

        expect(socket?.messages).toEqual([{ title: '', type: 'json', data: '{"a":1}' }]);
    });

    it('reads each variant a request offers with its title', () => {
        const socket = websocketOf(
            {
                websocket: {
                    message: [
                        { title: 'Hola', selected: true, message: { type: 'text', data: 'hi' } },
                        { title: 'Vacío' },
                        { message: {} },
                    ],
                },
            },
            'Live',
        );

        expect(socket?.messages).toEqual([
            { title: 'Hola', type: 'text', data: 'hi' },
            { title: 'Vacío', type: 'text', data: '' },
            { title: '', type: 'text', data: '' },
        ]);
    });

    it('keeps no message for a request that has none, whichever way it says so', () => {
        expect(websocketOf({ websocket: {} }, 'Live')?.messages).toEqual([]);
        expect(websocketOf({ websocket: { message: null } }, 'Live')?.messages).toEqual([]);
        expect(websocketOf({ websocket: { message: {} } }, 'Live')?.messages).toEqual([
            { title: '', type: 'text', data: '' },
        ]);
    });

    it('names what the request keeps that Mandor has no place for', () => {
        const socket = websocketOf(
            {
                info: { tags: ['live'] },
                websocket: { url: 'wss://a' },
                settings: { timeout: 5 },
                runtime: {
                    scripts: [{ type: 'before-request', code: 'x()' }],
                    variables: [{ name: 'a', value: '1' }],
                },
            },
            'Live',
        );

        expect(socket?.leftOut).toEqual(['scripts', 'settings', 'request variables', 'tags']);
    });
});
