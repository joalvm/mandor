import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ClientTls } from '../../src/client/client-network.js';
import { watchWsClient } from '../support/ws-client-watch.js';
import { startEchoServer } from '../support/echo-server.js';
import {
    startSilentServer,
    startTlsEchoServer,
    startTunnelProxy,
    TLS,
    type Closable,
} from '../support/network-servers.js';
import { startSocksProxy } from '../support/socks-proxy.js';

const opened: Closable[] = [];

async function started<Server extends Closable>(server: Promise<Server>): Promise<Server> {
    const value = await server;

    opened.push(value);

    return value;
}

afterEach(async () => {
    await Promise.all(opened.splice(0).map((server) => server.close()));
});

describe('the network a websocket dials through', () => {
    it('hands the credentials of its address to the handshake', async () => {
        const server = await started(startEchoServer());
        const watched = watchWsClient(server.url.replace('ws://', 'ws://user:secret@'));

        watched.client.open();
        await watched.opened;

        expect(server.lastHeaders()['authorization']).toBe(
            `Basic ${Buffer.from('user:secret').toString('base64')}`,
        );
        watched.client.dispose();
    });

    /** A server that takes the connection and never answers must not hold the attempt forever. */
    it('gives the handshake up once its timeout passes with no answer', async () => {
        const silent = await started(startSilentServer());
        const watched = watchWsClient(`ws://127.0.0.1:${String(silent.port)}`, {
            handshakeTimeoutMs: 50,
        });

        watched.client.open();

        await vi.waitFor(() => {
            expect(watched.errors.at(0)?.message).toMatch(/handshake has timed out/u);
        });
        expect(watched.states).toContain('error');
        watched.client.dispose();
    });

    it('trusts a private authority the connection names', async () => {
        const server = await started(startTlsEchoServer());
        const watched = watchWsClient(server.url, { tls: { ca: TLS.cert } });

        watched.client.open();
        await watched.opened;

        expect(watched.states).toEqual(['connecting', 'open']);
        watched.client.dispose();
    });

    it('refuses the same server when nothing names its authority', async () => {
        const server = await started(startTlsEchoServer());
        const watched = watchWsClient(server.url);

        watched.client.open();

        await vi.waitFor(() => {
            expect(watched.errors.at(0)?.message).toMatch(/self[- ]signed/u);
        });
        watched.client.dispose();
    });

    it.each<[string, ClientTls]>([
        ['a PEM pair', { ca: TLS.cert, cert: TLS.cert, key: TLS.key }],
        [
            'an encrypted key and its passphrase',
            { ca: TLS.cert, cert: TLS.cert, key: TLS.encryptedKey, passphrase: TLS.passphrase },
        ],
        ['a PKCS#12 bundle', { ca: TLS.cert, pfx: TLS.pfx, passphrase: TLS.passphrase }],
    ])('proves itself with %s to a server that demands a certificate', async (_, tls) => {
        const server = await started(startTlsEchoServer(true));
        const watched = watchWsClient(server.url, { tls });

        watched.client.open();
        await watched.opened;

        expect(watched.client.state).toBe('open');
        watched.client.dispose();
    });

    it('tunnels through an HTTP proxy with the credentials of its url', async () => {
        const server = await started(startEchoServer());
        const proxy = await started(startTunnelProxy());
        const credentials = new URL(proxy.url);

        credentials.username = 'ana';
        credentials.password = 's3cret';

        const watched = watchWsClient(server.url, { proxy: { url: String(credentials) } });

        watched.client.open();
        await watched.opened;

        expect(proxy.targets).toEqual([new URL(server.url).host]);
        expect(proxy.lastAuthorization()).toBe(
            `Basic ${Buffer.from('ana:s3cret').toString('base64')}`,
        );
        watched.client.dispose();
    });

    it('tunnels through a SOCKS5 proxy', async () => {
        const server = await started(startEchoServer());
        const proxy = await started(startSocksProxy());
        const watched = watchWsClient(server.url, { proxy: { url: proxy.url } });

        watched.client.open();
        await watched.opened;

        expect(proxy.targets).toEqual([new URL(server.url).host]);
        watched.client.dispose();
    });
});
