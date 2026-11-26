import type net from 'node:net';
import type tls from 'node:tls';
import { afterEach, describe, expect, it } from 'vitest';

import { timedConnector } from '../../src/timing/timed-connector.js';
import type { OpenTarget } from '../../src/timing/timed-socket.js';
import type { ConnectionPhases } from '../../src/timing/connection-phases.js';
import { startEchoServer, startSilentServer } from '../support/http-server.js';
import { startH2Server } from '../support/h2-server.js';

let closers: (() => Promise<void>)[] = [];

afterEach(async () => {
    for (const close of closers) {
        await close();
    }

    closers = [];
});

function phases(): ConnectionPhases {
    return {
        dnsMs: 0,
        connectMs: 0,
        tlsMs: 0,
        firstByteAt: 0,
        lastPhaseEndAt: 0,
        alpnProtocol: null,
        network: null,
    };
}

/**
 * What undici hands the connector: the parts of the url as written, the port a text that is
 * empty when the url leaves it to its scheme.
 */
function targetOf(url: URL): Pick<OpenTarget, 'hostname' | 'protocol'> & { port: string } {
    return { hostname: url.hostname, port: url.port, protocol: url.protocol };
}

/** Where the connector dialed: the peer it reached, or the address its failure names. */
function dialed(origin: string): Promise<string> {
    const connector = timedConnector({ verify: false }, 2_000, phases());

    return new Promise((resolve) => {
        connector(targetOf(new URL(origin)), (error, socket) => {
            socket?.destroy();
            resolve(
                socket
                    ? `${String(socket.remoteAddress)}:${String(socket.remotePort)}`
                    : error.message,
            );
        });
    });
}

function connect(origin: string, connectMs = 2_000) {
    const url = new URL(origin);
    const measured = phases();
    const connector = timedConnector({ verify: false }, connectMs, measured);
    const target = targetOf(url);

    return new Promise<{ socket: net.Socket | tls.TLSSocket; measured: ConnectionPhases }>(
        (resolve, reject) => {
            connector(target, (error, socket) => {
                if (error) {
                    reject(error);

                    return;
                }

                resolve({ socket: socket, measured });
            });
        },
    );
}

describe('timedConnector', () => {
    it('measures DNS, TCP and TLS apart against a local https server', async () => {
        const server = await startEchoServer({ https: true });

        closers.push(() => server.close());

        const { socket, measured } = await connect(server.origin);

        expect(measured.dnsMs).toBeGreaterThanOrEqual(0);
        expect(measured.connectMs).toBeGreaterThanOrEqual(0);
        expect(measured.tlsMs).toBeGreaterThan(0);
        expect(measured.dnsMs + measured.connectMs + measured.tlsMs).toBeLessThan(2_000);
        socket.destroy();
    });

    it('resolves a name through the lookup when the host is not an address', async () => {
        const server = await startEchoServer({ https: true });

        closers.push(() => server.close());

        const origin = server.origin.replace('127.0.0.1', 'localhost');
        const { socket, measured } = await connect(origin);

        expect(measured.dnsMs).toBeGreaterThanOrEqual(0);
        socket.destroy();
    });

    it('negotiates h2 against a local http2 server', async () => {
        const server = await startH2Server();

        closers.push(() => server.close());

        const { socket, measured } = await connect(server.origin);

        expect(measured.alpnProtocol).toBe('h2');
        socket.destroy();
    });

    it('keeps TLS at zero and no ALPN on plain http', async () => {
        const server = await startEchoServer();

        closers.push(() => server.close());

        const { socket, measured } = await connect(server.origin);

        expect(measured.tlsMs).toBe(0);
        expect(measured.alpnProtocol).toBeNull();
        socket.destroy();
    });

    /** A url with no port is most of the web: dialing port 0 instead failed every such send. */
    it.each([
        ['http://127.0.0.1/', '127.0.0.1:80'],
        ['https://127.0.0.1/', '127.0.0.1:443'],
    ])('dials the port of the scheme when %s names none', async (origin, address) => {
        expect(await dialed(origin)).toContain(address);
    });

    it('fails with the connect timeout when the server never completes the connection', async () => {
        const server = await startSilentServer();

        closers.push(() => server.close());

        const error = await connect(`https://127.0.0.1:${String(server.port)}`, 50).catch(
            (caught: unknown) => caught,
        );

        expect((error as NodeJS.ErrnoException).code).toBe('UND_ERR_CONNECT_TIMEOUT');
    });
});
