import { describe, expect, it } from 'vitest';

import { websocketOf } from '../../../src/insomnia/document/node-of.js';

describe('websocketOf', () => {
    it('fills what the request left unsaid with what an empty WebSocket request holds', () => {
        expect(websocketOf({}, '')).toEqual({
            kind: 'websocket',
            name: '',
            url: '',
            description: '',
            headers: [],
            parameters: [],
            pathParameters: [],
            authentication: undefined,
        });
    });

    it('keeps the address, the rows and the auth, and has neither a method nor a body', () => {
        const socket = websocketOf(
            {
                name: 'Feed',
                url: 'wss://x.test',
                method: 'POST',
                headers: [{ name: 'X', value: '1', disabled: true }],
                authentication: { type: 'bearer', token: 't' },
            },
            'Notes',
        );

        expect(socket).toMatchObject({
            name: 'Feed',
            url: 'wss://x.test',
            description: 'Notes',
            headers: [{ name: 'X', value: '1', disabled: true }],
            authentication: { type: 'bearer', token: 't' },
        });
        expect(socket).not.toHaveProperty('method');
        expect(socket).not.toHaveProperty('body');
    });
});
