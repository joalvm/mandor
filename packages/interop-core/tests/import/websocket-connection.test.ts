import { degradation } from '../../src/resource/degradation.js';
import { describe, expect, it } from 'vitest';

import {
    websocketConnectionOf,
    type ForeignWebsocket,
} from '../../src/import/websocket-connection.js';

const where = { kind: 'insomnia', sourceId: 'wrk_1', route: 'chat' } as const;

function line(key: string, value: string, enabled = true) {
    return { key, value, enabled };
}

function socket(parts: Partial<ForeignWebsocket> = {}): ForeignWebsocket {
    return {
        name: 'Chat',
        url: 'ws://localhost:4010/chat',
        description: '',
        headers: [],
        query: [],
        auth: undefined,
        degradations: [],
        ...parts,
    };
}

describe('websocketConnectionOf', () => {
    it('makes a websocket connection of the name and the url', () => {
        const resource = websocketConnectionOf(socket(), where);

        expect(resource).toMatchObject({
            place: 'connection',
            itemKind: null,
            route: 'chat',
            name: 'Chat',
            fields: { name: 'Chat', url: 'ws://localhost:4010/chat', transport: 'websocket' },
            origin: { kind: 'insomnia', sourceId: 'wrk_1' },
            degradations: [],
        });
    });

    it('keeps the headers on and the ones switched off, and drops a line with no name', () => {
        const resource = websocketConnectionOf(
            socket({
                headers: [line('duration', '5'), line('x-skip', '1', false), line('', 'half')],
            }),
            where,
        );

        expect(resource.fields['headers']).toEqual([
            line('duration', '5'),
            line('x-skip', '1', false),
        ]);
    });

    it('takes the subprotocol header as the subprotocols of the connection', () => {
        const resource = websocketConnectionOf(
            socket({
                headers: [line('Sec-WebSocket-Protocol', 'graphql-ws, chat'), line('a', 'b')],
            }),
            where,
        );

        expect(resource.fields).toMatchObject({
            headers: [line('a', 'b')],
            websocket: { subprotocols: ['graphql-ws', 'chat'] },
        });
    });

    it.each(['has space', '{{protocol}}', '', 'a,b,c,d,e,f,g,h,i'])(
        'keeps a subprotocol header it cannot offer as a header: %s',
        (value) => {
            const resource = websocketConnectionOf(
                socket({ headers: [line('sec-websocket-protocol', value)] }),
                where,
            );

            expect(resource.fields['websocket']).toBeUndefined();
            expect(resource.fields['headers']).toEqual([line('sec-websocket-protocol', value)]);
        },
    );

    it('carries the query, the notes and the auth when the document has them', () => {
        const auth = { type: 'bearer', token: '{{token}}' } as const;
        const resource = websocketConnectionOf(
            socket({ query: [line('room', '1')], description: 'Lobby', auth }),
            where,
        );

        expect(resource.fields).toMatchObject({
            params: [line('room', '1')],
            description: 'Lobby',
            auth,
        });
    });

    it('names no key it has nothing for', () => {
        const resource = websocketConnectionOf(socket(), where);

        expect(Object.keys(resource.fields).sort()).toEqual([
            'headers',
            'name',
            'transport',
            'url',
        ]);
    });

    it('keeps the fingerprint of what it owns, the same for the same document', () => {
        const first = websocketConnectionOf(socket(), where);
        const again = websocketConnectionOf(socket(), where);
        const other = websocketConnectionOf(socket({ url: 'ws://other' }), where);

        expect(first.origin.fingerprint).toBe(again.origin.fingerprint);
        expect(first.origin.fingerprint).not.toBe(other.origin.fingerprint);
    });

    it('says what it left out, and bars a url that is not a websocket address', () => {
        const resource = websocketConnectionOf(
            socket({
                url: 'localhost:4010',
                degradations: [degradation('authNoEquivalentRequest', { type: 'digest' })],
            }),
            where,
        );

        expect(resource.degradations).toEqual([
            degradation('authNoEquivalentRequest', { type: 'digest' }),
            degradation('urlNotWebsocket', { url: 'localhost:4010' }),
        ]);
    });

    it('lets a url with a variable pass, since it is judged when it is dialled', () => {
        const resource = websocketConnectionOf(socket({ url: 'wss://{{host}}/chat' }), where);

        expect(resource.degradations).toEqual([]);
    });
});
