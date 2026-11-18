import { describe, expect, it } from 'vitest';

import {
    connectionKindOf,
    itemKindOf,
    unwrittenReasonOf,
} from '../../src/workspace/outline-kind.js';

describe('connectionKindOf', () => {
    it('tells Socket.IO from the connections that speak plain WebSocket', () => {
        expect(connectionKindOf('websocket')).toBe('connection');
        expect(connectionKindOf('socketio')).toBe('socketio');
    });
});

describe('itemKindOf', () => {
    it('knows requests and messages and calls any other item other', () => {
        const item = (kind: string) => ({ kind, name: 'x', tags: [], body: {} });

        expect([item('request'), item('message'), item('raro')].map(itemKindOf)).toEqual([
            'request',
            'message',
            'other',
        ]);
    });
});

describe('unwrittenReasonOf', () => {
    it('gives the reason the format has for the kind', () => {
        expect(unwrittenReasonOf('request', { request: 'messagesNotHttp' })).toBe(
            'messagesNotHttp',
        );
    });

    it('lets Socket.IO fall back to the reason of connections when the format names none for it', () => {
        expect(unwrittenReasonOf('socketio', { connection: 'noConnections' })).toBe(
            'noConnections',
        );
        expect(
            unwrittenReasonOf('socketio', { socketio: 'noSocketio', connection: 'noConnections' }),
        ).toBe('noSocketio');
    });

    it('has no reason for a kind the format writes', () => {
        expect(unwrittenReasonOf('request', {})).toBeUndefined();
        expect(unwrittenReasonOf('socketio', {})).toBeUndefined();
    });
});
