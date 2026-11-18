import { afterEach, describe, expect, it } from 'vitest';

import { startEchoServer, type EchoServer } from '../support/echo-server.js';
import { watchManager } from '../support/manager-watch.js';
import { waitFor } from '../support/wait-for.js';

describe('a send that the schema went unmet', () => {
    let server: EchoServer | undefined;
    let dispose: (() => void) | undefined = undefined;

    afterEach(async () => {
        dispose?.();
        await server?.close();
        server = undefined;
        dispose = undefined;
    });

    /** The mark is a datum of the record: what the timeline shows is what main judged. */
    it('carries the unmet mark on the record of the frame that left', async () => {
        server = await startEchoServer();
        const watched = watchManager();

        dispose = () => {
            watched.manager.disposeAll();
        };

        await watched.manager.open({
            connectionId: 'gateway',
            transport: 'websocket',
            url: server.url,
        });

        await watched.manager.send({
            connectionId: 'gateway',
            data: 'hola',
            schemaUnmet: true,
        });

        await waitFor(() => {
            expect(watched.records.some((record) => record.schemaUnmet === true)).toBe(true);
        });
    });

    it('carries no mark when the caller found nothing to accuse', async () => {
        server = await startEchoServer();
        const watched = watchManager();

        dispose = () => {
            watched.manager.disposeAll();
        };

        await watched.manager.open({
            connectionId: 'gateway',
            transport: 'websocket',
            url: server.url,
        });

        await watched.manager.send({ connectionId: 'gateway', data: 'hola' });

        await waitFor(() => {
            expect(watched.records.some((record) => record.direction === 'out')).toBe(true);
        });

        expect(watched.records.some((record) => record.schemaUnmet === true)).toBe(false);
    });
});
