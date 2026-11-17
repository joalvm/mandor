import { describe, expect, it } from 'vitest';

import { parseConnection, type Connection } from '@mandor/schema';

import { withNewLine } from '@mandor/env';

import {
    authRecordsOf,
    linesOf,
    sameRecords,
    writtenOf,
} from '../../../../../src/renderer/features/connections/lib/entry-lines.js';

function connectionOf(changes: Record<string, unknown>): Connection {
    return parseConnection({
        environmentId: null,
        headers: [],
        id: 'orders',
        name: 'Orders',
        transport: 'websocket',
        url: 'ws://localhost:3000',
        ...changes,
    });
}

describe('the lines of the entry editor and the records they stand for', () => {
    it('reads the sent entries first and the ones on hold after them', () => {
        const lines = linesOf({
            off: { 'x-off': 'kept' },
            on: { Authorization: 'Bearer token' },
        });

        expect(lines).toHaveLength(2);
        expect(lines[0]).toMatchObject({ disabled: false, name: 'Authorization' });
        expect(lines[1]).toMatchObject({ disabled: true, name: 'x-off' });
    });

    it('writes the records back: an off line is kept without being sent', () => {
        const records = writtenOf([
            { disabled: false, id: '0', name: 'Authorization', value: 'Bearer token' },
            { disabled: true, id: '1', name: 'x-off', value: 'kept' },
        ]);

        expect(records).toEqual({
            off: { 'x-off': 'kept' },
            on: { Authorization: 'Bearer token' },
        });
    });

    it('writes no entry for a line that has no name yet', () => {
        const records = writtenOf([
            { disabled: false, id: '0', name: '', value: 'half typed' },
            { disabled: true, id: '1', name: 'x-off', value: 'kept' },
        ]);

        expect(records.on).toEqual({});
        expect(records.off).toEqual({ 'x-off': 'kept' });
    });

    it('answers whether two pairs of records say the same thing', () => {
        const one = { off: {}, on: { Authorization: 'token' } };
        const other = { off: { 'x-off': 'kept' }, on: { Authorization: 'token' } };

        expect(sameRecords(one, { off: {}, on: { Authorization: 'token' } })).toBe(true);
        expect(sameRecords(one, other)).toBe(false);
    });

    it('hands a new line an identity none of the others holds', () => {
        const lines = withNewLine([
            { disabled: false, id: '0', name: 'Authorization', value: 'token' },
        ]);

        expect(lines).toHaveLength(2);
        expect(lines[1]?.id).toBe('1');
    });

    it('reads the auth records of a socket.io connection from its own group', () => {
        expect(
            authRecordsOf(
                connectionOf({
                    socketio: { auth: { token: '{{token}}' }, disabledAuth: { old: 'kept' } },
                    transport: 'socketio',
                    url: 'https://localhost:3000',
                }),
            ),
        ).toEqual({ off: { old: 'kept' }, on: { token: '{{token}}' } });
    });

    it('reads the auth records of a connection without a socket.io group as one empty pair', () => {
        expect(authRecordsOf(connectionOf({}))).toEqual({ off: {}, on: {} });
    });
});
