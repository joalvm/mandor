import { describe, expect, it } from 'vitest';

import { insomniaIdOf } from '../../../src/insomnia/export/insomnia-id.js';
import { websocketDocumentOf } from '../../../src/insomnia/export/websocket-document.js';
import { LOBBY } from '../support/sample-workspace.js';

describe('websocketDocumentOf', () => {
    it('writes the address, the name and an id drawn from the connection', () => {
        const document = websocketDocumentOf(LOBBY, undefined);

        expect(document).toMatchObject({
            url: 'wss://{{ _.host }}/lobby',
            name: 'Lobby',
            meta: { id: insomniaIdOf('ws-req', 'lobby'), description: 'The public room' },
        });
        expect(insomniaIdOf('ws-req', 'lobby')).toMatch(/^ws-req_[0-9a-f]{32}$/);
    });

    it('writes the headers, the subprotocols in their header, and the switched off ones marked', () => {
        const document = websocketDocumentOf(LOBBY, undefined);

        expect(document['headers']).toEqual([
            { name: 'x-room', value: '7' },
            { name: 'Sec-WebSocket-Protocol', value: 'chat, superchat' },
            { name: 'x-off', value: '1', disabled: true },
        ]);
        expect(document['parameters']).toEqual([{ name: 'room', value: '1' }]);
    });

    it('speaks its own auth, and the one of the workspace when it has none', () => {
        const own = websocketDocumentOf(LOBBY, { type: 'basic', username: 'ana', password: '' });
        const bare = { ...LOBBY };

        delete bare.auth;

        expect(own['authentication']).toEqual({ type: 'bearer', token: '{{ _.token }}' });
        expect(
            websocketDocumentOf(bare, { type: 'bearer', token: '{{w}}' })['authentication'],
        ).toEqual({ type: 'bearer', token: '{{ _.w }}' });
        expect(websocketDocumentOf(bare, undefined)).not.toHaveProperty('authentication');
    });

    it('writes no table and no description a connection does not have', () => {
        const document = websocketDocumentOf(
            {
                ...LOBBY,
                headers: [],
                params: undefined,
                websocket: undefined,
                auth: undefined,
                description: undefined,
            },
            undefined,
        );

        expect(document).toEqual({
            url: 'wss://{{ _.host }}/lobby',
            name: 'Lobby',
            meta: { id: insomniaIdOf('ws-req', 'lobby') },
        });
    });
});
