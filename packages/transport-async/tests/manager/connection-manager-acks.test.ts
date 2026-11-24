import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    armAck,
    cancelAcks,
    recordReply,
    settleAck,
    type AckBook,
} from '../../src/manager/ack-waiting.js';
import { startSocketIoServer, type SocketIoServer } from '../support/socketio-server.js';
import { watchManager } from '../support/manager-watch.js';
import { waitFor } from '../support/wait-for.js';

/**
 * An emission that asks for an answer is linked to whatever comes back: two entries of the
 * timeline, one identifier, and a wait that never stays open past its own time.
 */
describe('the book of open waits', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    function connectionOf(): { connection: AckBook; recorded: unknown[] } {
        const recorded: unknown[] = [];
        const connection: AckBook = {
            acks: new Map(),
            batcher: {
                record: (entry) => {
                    recorded.push(entry);
                },
            },
            ackSeq: 0,
            request: { connectionId: 'gateway' },
        };

        return { connection, recorded };
    }

    it('closes a wait on its own when the timeout runs out', () => {
        vi.useFakeTimers();
        const { connection, recorded } = connectionOf();

        armAck(connection, {
            connectionId: 'gateway',
            data: 'hola',
            event: 'chat:message',
            expectAck: { timeoutMs: 1_000 },
        });
        expect(connection.acks.size).toBe(1);

        vi.advanceTimersByTime(1_001);

        expect(connection.acks.size).toBe(0);
        expect(recorded).toHaveLength(1);
    });

    it('records an answer that names no wait it holds, without a time', () => {
        const { connection, recorded } = connectionOf();

        armAck(connection, {
            connectionId: 'gateway',
            data: 'hola',
            expectAck: { timeoutMs: 5_000 },
        });
        const record = recordReply(connection, {
            data: 'stranger',
            event: 'chat:message',
            replyTo: 'ack-gateway-9',
        });

        expect(record.replyTo).toBe('ack-gateway-9');
        expect(record.elapsedMs).toBeUndefined();
        expect(recorded).toHaveLength(0);

        const nameless = recordReply(connection, { data: 'hola', event: 'chat:message' });

        expect(nameless.replyTo).toBeUndefined();
        expect(nameless.elapsedMs).toBeUndefined();
    });

    it('answers how long the answer took, and forgets the wait', () => {
        const { connection } = connectionOf();

        armAck(connection, {
            connectionId: 'gateway',
            data: 'hola',
            event: 'chat:message',
            expectAck: { timeoutMs: 5_000 },
        });
        const elapsed = settleAck(connection, 'ack-gateway-1');

        expect(elapsed).toBeGreaterThanOrEqual(0);
        expect(settleAck(connection, 'ack-gateway-1')).toBeUndefined();
    });

    it('forgets every wait when the connection goes away', () => {
        const { connection } = connectionOf();

        armAck(connection, {
            connectionId: 'gateway',
            data: 'hola',
            expectAck: { timeoutMs: 5_000 },
        });
        cancelAcks(connection);

        expect(connection.acks.size).toBe(0);
        expect(settleAck(connection, 'ack-gateway-1')).toBeUndefined();
    });
});

describe('a send that waits for an ack', () => {
    let server: SocketIoServer | undefined;

    afterEach(async () => {
        vi.useRealTimers();
        await server?.close();
        server = undefined;
    });

    it(
        'names the emission and links the reply it gets back, with the time it took',
        { timeout: 45_000 },
        async () => {
            server = await startSocketIoServer();
            const watched = watchManager();

            await watched.manager.open({
                connectionId: 'gateway',
                transport: 'socketio',
                url: server.url,
            });

            await watched.manager.send({
                connectionId: 'gateway',
                data: 'hola',
                event: 'chat:message',
                expectAck: { timeoutMs: 5_000 },
            });

            await waitFor(() => {
                expect(watched.records.some((record) => record.replyTo !== undefined)).toBe(true);
            });

            const emission = watched.records.find(
                (record) => record.direction === 'out' && record.id !== undefined,
            );
            const reply = watched.records.find((record) => record.replyTo !== undefined);

            expect(emission).toBeDefined();
            expect(reply?.replyTo).toBe(emission?.id);
            expect(reply?.data).toBe('hola');
            expect(typeof reply?.elapsedMs).toBe('number');
            expect(watched.records.some((record) => record.timedOut === true)).toBe(false);

            await watched.manager.close({ connectionId: 'gateway' });
        },
    );

    it('closes the wait as a fault when no answer comes in time', { timeout: 45_000 }, async () => {
        server = await startSocketIoServer();
        const watched = watchManager();

        await watched.manager.open({
            connectionId: 'gateway',
            transport: 'socketio',
            url: server.url,
        });

        server.ignore('silent:event');

        // A name the echo never answers: the wait runs out on its own.
        await watched.manager.send({
            connectionId: 'gateway',
            data: 'hola',
            event: 'silent:event',
            expectAck: { timeoutMs: 50 },
        });

        await waitFor(() => {
            expect(watched.records.some((record) => record.timedOut === true)).toBe(true);
        });

        const emission = watched.records.find(
            (record) => record.direction === 'out' && record.id !== undefined,
        );
        const timeout = watched.records.find((record) => record.timedOut === true);

        expect(timeout?.replyTo).toBe(emission?.id);
        expect(timeout?.data).toBe('');

        await watched.manager.close({ connectionId: 'gateway' });
    });
});
