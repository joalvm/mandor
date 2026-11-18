import type { WorkspaceFolderNode } from '@mandor/interop-core';
import type { CollectionItem, Connection } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { savedMessagesOf } from '../../../src/bruno/export/saved-messages.js';

function message(name: string, payload = 'hola'): CollectionItem {
    return { kind: 'message', name, tags: [], body: { payload, payloadType: 'text' } };
}

function level(items: CollectionItem[], folders: WorkspaceFolderNode[] = []): WorkspaceFolderNode {
    return { name: 'L', settings: { variables: [], headers: [] }, folders, items };
}

function socket(id: string, name: string, transport = 'websocket'): Connection {
    return { id, name, transport } as Connection;
}

const SOCKETS = [socket('a', 'Chat'), socket('b', 'Feed')];

describe('savedMessagesOf', () => {
    it('has nowhere to put a message when no WebSocket connection is written', () => {
        const saved = savedMessagesOf({
            collections: [level([message('Suelto')])],
            connections: [socket('s', 'Io', 'socketio')],
        });

        expect([...saved]).toEqual([]);
    });

    it('gives each message to the connection it is named after, at any depth', () => {
        const saved = savedMessagesOf({
            collections: [
                level(
                    [message('Feed: alta'), message('Feed')],
                    [level([message('Chat 2'), message('Chat nuevo')])],
                ),
            ],
            connections: SOCKETS,
        });

        expect(saved.get('b')).toEqual([
            { title: 'alta', message: { type: 'text', data: 'hola' } },
            { title: '', message: { type: 'text', data: 'hola' } },
        ]);
        expect(saved.get('a')).toEqual([
            { title: '', message: { type: 'text', data: 'hola' } },
            { title: 'Chat nuevo', message: { type: 'text', data: 'hola' } },
        ]);
    });

    it('leaves the rest in the first connection, and ignores what is not a message', () => {
        const request = { kind: 'request', name: 'Feed', tags: [], body: {} };
        const saved = savedMessagesOf({
            collections: [level([message('Ping'), request])],
            connections: SOCKETS,
        });

        expect(saved.get('a')).toEqual([
            { title: 'Ping', message: { type: 'text', data: 'hola' } },
        ]);
        expect(saved.get('b')).toEqual([]);
    });
});
