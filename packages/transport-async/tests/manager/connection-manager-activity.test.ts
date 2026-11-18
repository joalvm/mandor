import { afterEach, describe, expect, it } from 'vitest';

import { startEchoServer, type EchoServer } from '../support/echo-server.js';

import { watchManager } from '../support/manager-watch.js';
import { waitFor } from '../support/wait-for.js';

const WS_OPEN = { transport: 'websocket' } as const;

describe('ConnectionManager activity', () => {
    let server: EchoServer | undefined;

    afterEach(async () => {
        await server?.close();
        server = undefined;
    });

    it('reports outbound and inbound frames as activity in batches', async () => {
        server = await startEchoServer();
        const watched = watchManager();

        await watched.manager.open({ ...WS_OPEN, connectionId: 'gateway', url: server.url });

        await watched.manager.send({ connectionId: 'gateway', data: 'hola' });
        await waitFor(() => {
            expect(watched.records).toHaveLength(2);
        });

        expect(watched.records.map((entry) => entry.direction)).toEqual(['out', 'in']);
        expect(watched.records.map((entry) => entry.data)).toEqual(['hola', 'hola']);
        expect(watched.batches[0]?.connectionId).toBe('gateway');
        watched.manager.disposeAll();
    });

    /** What went out is half the story: the timeline also says what it was sent from. */
    it('files an outbound frame under the item it was sent from', async () => {
        server = await startEchoServer();
        const watched = watchManager();

        await watched.manager.open({ ...WS_OPEN, connectionId: 'gateway', url: server.url });

        await watched.manager.send({
            connectionId: 'gateway',
            data: 'hola',
            origin: 'Pedido creado',
        });
        await waitFor(() => {
            expect(watched.records).toHaveLength(2);
        });

        expect(watched.records.map((entry) => entry.origin)).toEqual(['Pedido creado', undefined]);
        watched.manager.disposeAll();
    });

    it('batches a flood instead of emitting one push per frame', async () => {
        server = await startEchoServer();
        const watched = watchManager({ batchSize: 100, batchWindowMs: 25, bufferMax: 1_000 });

        await watched.manager.open({ ...WS_OPEN, connectionId: 'gateway', url: server.url });

        for (let index = 0; index < 1_000; index += 1) {
            await watched.manager.send({ connectionId: 'gateway', data: `msg-${String(index)}` });
        }

        await waitFor(() => {
            expect(watched.records).toHaveLength(2_000);
        });

        expect(watched.batches.length).toBeLessThan(100);
        watched.manager.disposeAll();
    });

    /**
     * A frame that is not UTF-8 is destroyed by being read as text, so it travels encoded and
     * says so. What it weighs on the timeline is still the bytes that crossed the wire.
     */
    it('reports a binary frame as the base64 of the bytes that arrived', async () => {
        server = await startEchoServer();
        const watched = watchManager();

        await watched.manager.open({ ...WS_OPEN, connectionId: 'gateway', url: server.url });

        server.broadcastBinary(new Uint8Array([0, 1, 2, 0xff]));
        await waitFor(() => {
            expect(watched.records).toHaveLength(1);
        });

        expect(watched.records[0]).toMatchObject({
            binary: true,
            data: 'AAEC/w==',
            direction: 'in',
        });
        watched.manager.disposeAll();
    });

    /** Text frames say nothing about bytes: a reader that checks the flag must not see it here. */
    it('leaves the binary flag off a frame that arrived as text', async () => {
        server = await startEchoServer();
        const watched = watchManager();

        await watched.manager.open({ ...WS_OPEN, connectionId: 'gateway', url: server.url });

        await watched.manager.send({ connectionId: 'gateway', data: 'marcador' });
        await waitFor(() => {
            expect(watched.records).toHaveLength(2);
        });

        expect(watched.records.map((entry) => entry.binary)).toEqual([undefined, undefined]);
        watched.manager.disposeAll();
    });
});
