import { describe, expect, it } from 'vitest';

import { FormatError, parseConnection } from '../../src/index.js';
import { connectionSchema } from '../../src/connection/connection-schema.js';

const validConnection = {
    id: 'gateway-local',
    name: 'Gateway local',
    transport: 'websocket',
    url: 'wss://example.com/socket',
    headers: [{ key: 'Authorization', value: 'Bearer {{token}}', enabled: true }],
    environmentId: null,
};

describe('parseConnection', () => {
    it('accepts a valid connection', () => {
        expect(parseConnection(validConnection)).toEqual(validConnection);
    });

    it('rejects a transport outside the union', () => {
        expect(() => {
            parseConnection({ ...validConnection, transport: 'sse' });
        }).toThrow(/transport/);
    });

    it('rejects a non-websocket URL scheme', () => {
        expect(() => {
            parseConnection({ ...validConnection, url: 'https://example.com' });
        }).toThrow(/url/);
    });

    /** The file keeps a connection nobody pointed anywhere yet; the dial is what refuses it. */
    it('keeps a connection whose url is still empty, whatever its transport', () => {
        expect(parseConnection({ ...validConnection, url: '' }).url).toBe('');
        expect(parseConnection({ ...validConnection, transport: 'socketio', url: '' }).url).toBe(
            '',
        );
    });

    it('accepts a socket.io connection that dials an http url', () => {
        const connection = {
            ...validConnection,
            transport: 'socketio',
            url: 'https://example.com',
        };

        expect(parseConnection(connection)).toEqual(connection);
    });

    it('rejects a socket.io connection whose url is a websocket url', () => {
        expect(() => {
            parseConnection({ ...validConnection, transport: 'socketio' });
        }).toThrow(/url/);
    });

    it('rejects a websocket URL with no host', () => {
        expect(() => {
            parseConnection({ ...validConnection, url: 'ws://' });
        }).toThrow(/url/);
    });

    it('requires environmentId to be present even when null', () => {
        expect(() => {
            parseConnection({
                id: 'gateway-local',
                name: 'Gateway local',
                transport: 'websocket',
                url: 'wss://example.com/socket',
                headers: [],
            });
        }).toThrow(/environmentId/);
    });

    it('reports a wrongly typed field as a format error', () => {
        expect(() => {
            parseConnection({ ...validConnection, name: 42 });
        }).toThrow(FormatError);
    });

    it('accepts unknown keys but strips them from parsed domain data', () => {
        expect(parseConnection({ ...validConnection, protocols: ['future'] })).toEqual(
            validConnection,
        );
    });

    it('reads a connection written before the transport field as websocket', () => {
        const legacy: Record<string, unknown> = { ...validConnection };

        delete legacy['transport'];

        expect(connectionSchema.parse(legacy)).toEqual(validConnection);
    });

    /** Files on disk from before the headers were lines keep every header, switched off or not. */
    it('reads the headers of a connection written as records', () => {
        expect(
            parseConnection({
                ...validConnection,
                headers: { Authorization: 'Bearer {{token}}' },
                disabledHeaders: { 'X-Debug': '1' },
            }).headers,
        ).toEqual([
            { key: 'Authorization', value: 'Bearer {{token}}', enabled: true },
            { key: 'X-Debug', value: '1', enabled: false },
        ]);
    });

    it('keeps the auth of the connection when the file is read and written again', () => {
        const auth = { inherit: true };

        expect(parseConnection({ ...validConnection, auth }).auth).toEqual(auth);
    });
});
