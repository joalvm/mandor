import { describe, expect, it } from 'vitest';

import { websocketDocumentOf } from '../../../src/bruno/export/websocket-document.js';
import { LOBBY } from '../support/sample-workspace.js';

describe('websocketDocumentOf', () => {
    it('writes the request with its query in the url, its headers, its auth and its notes', () => {
        expect(websocketDocumentOf(LOBBY, { seq: 4, inherited: undefined })).toEqual({
            info: { name: 'Lobby', type: 'websocket', seq: 4 },
            websocket: {
                url: 'wss://{{host}}/lobby?room=1',
                headers: [
                    { name: 'x-room', value: '7' },
                    { name: 'Sec-WebSocket-Protocol', value: 'chat, superchat' },
                    { name: 'x-off', value: '1', disabled: true },
                ],
                auth: { type: 'bearer', token: '{{token}}' },
            },
            docs: 'The public room',
        });
    });

    it('answers to the auth of the workspace when the connection has none of its own', () => {
        const document = websocketDocumentOf(
            { ...LOBBY, auth: undefined },
            { seq: 1, inherited: { type: 'basic', username: 'ana', password: '{{pw}}' } },
        );

        expect(document['websocket']).toMatchObject({ auth: { type: 'basic', username: 'ana' } });
    });

    it('inherits when neither the connection nor the workspace asks for auth', () => {
        const document = websocketDocumentOf(
            { ...LOBBY, auth: undefined },
            { seq: 1, inherited: undefined },
        );

        expect(document['websocket']).toMatchObject({ auth: 'inherit' });
    });

    it('writes no headers and no notes for a connection that has none', () => {
        const document = websocketDocumentOf(
            {
                id: 'bare',
                name: 'Bare',
                transport: 'websocket',
                url: 'wss://x.test',
                headers: [],
                environmentId: null,
            },
            { seq: 2, inherited: undefined },
        );

        expect(document).toEqual({
            info: { name: 'Bare', type: 'websocket', seq: 2 },
            websocket: { url: 'wss://x.test', auth: 'inherit' },
        });
    });

    it('writes the messages it keeps as the variants Bruno lists', () => {
        const messages = [{ title: 'Ping', message: { type: 'text', data: 'hola' } }];
        const document = websocketDocumentOf(LOBBY, { seq: 1, inherited: undefined, messages });

        expect(document['websocket']).toMatchObject({ message: messages });
    });
});
