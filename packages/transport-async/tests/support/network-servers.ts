import { readFileSync } from 'node:fs';
import { createServer as createHttpServer, type IncomingMessage } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import net, { type AddressInfo } from 'node:net';

import { WebSocketServer } from 'ws';

/** The self-signed pair every TLS test trusts: `localhost` and `127.0.0.1`, no usage limits. */
export const TLS = {
    cert: readFileSync(new URL('./tls/cert.pem', import.meta.url), 'utf8'),
    key: readFileSync(new URL('./tls/key.pem', import.meta.url), 'utf8'),
    encryptedKey: readFileSync(new URL('./tls/key-encrypted.pem', import.meta.url), 'utf8'),
    pfx: new Uint8Array(readFileSync(new URL('./tls/client.p12', import.meta.url))),
    passphrase: 'mandor',
};

export type Closable = { close: () => Promise<void> };

/** Tracks the sockets of a server so closing it never waits on one a test left open. */
function closer(server: net.Server): () => Promise<void> {
    const open = new Set<net.Socket>();

    server.on('connection', (socket: net.Socket) => {
        open.add(socket);
        socket.on('close', () => open.delete(socket));
    });

    return () =>
        new Promise<void>((resolve) => {
            for (const socket of open) {
                socket.destroy();
            }

            server.close(() => {
                resolve();
            });
        });
}

async function listening(server: net.Server): Promise<number> {
    await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });

    return (server.address() as AddressInfo).port;
}

/** A server that takes the TCP connection and never says a word: the handshake hangs on it. */
export async function startSilentServer(): Promise<Closable & { port: number }> {
    const server = net.createServer(() => undefined);
    const close = closer(server);
    const port = await listening(server);

    return { port, close };
}

/**
 * A server that answers every request with a body that never ends, a mebibyte at a time, as fast
 * as the client reads it.
 */
export async function startEndlessServer(): Promise<Closable & { url: string }> {
    const chunk = Buffer.alloc(1024 * 1024, 'a');
    const server = createHttpServer((_request, response) => {
        response.writeHead(200, { 'content-type': 'text/plain; charset=UTF-8' });

        function pour(): void {
            while (!response.destroyed && response.write(chunk)) {
                // Written into the buffer of the socket; the next one waits for room.
            }
        }

        response.on('drain', pour);
        pour();
    });
    const close = closer(server);
    const port = await listening(server);

    return { url: `http://127.0.0.1:${String(port)}`, close };
}

/**
 * A wss echo on the self-signed pair. With `requireClientCert` the server asks the client for a
 * certificate signed by the same pair and refuses the handshake without one.
 */
export async function startTlsEchoServer(
    requireClientCert = false,
): Promise<Closable & { url: string }> {
    const https = createHttpsServer({
        cert: TLS.cert,
        key: TLS.key,
        ca: TLS.cert,
        requestCert: requireClientCert,
        rejectUnauthorized: requireClientCert,
    });
    const sockets = new WebSocketServer({ server: https });

    sockets.on('connection', (socket) => {
        socket.on('message', (data: Buffer, isBinary: boolean) => {
            socket.send(data, { binary: isBinary });
        });
    });

    const close = closer(https);
    const port = await listening(https);

    return {
        url: `wss://localhost:${String(port)}`,
        close: async () => {
            sockets.close();
            await close();
        },
    };
}

export type ProxyServer = Closable & {
    url: string;
    /** The targets each tunnel asked for, in the order they arrived. */
    targets: string[];
    /** What the last tunnel request carried as its credentials, if anything. */
    lastAuthorization: () => string | undefined;
};

/** An HTTP proxy that only tunnels: it answers CONNECT and pipes both ways. */
export async function startTunnelProxy(): Promise<ProxyServer> {
    const server = createHttpServer();
    const targets: string[] = [];
    let authorization: string | undefined;

    server.on('connect', (request: IncomingMessage, client: net.Socket, head: Buffer) => {
        const target = request.url ?? '';
        const [host = '', port = '443'] = target.split(':');
        const upstream = net.connect(Number(port), host, () => {
            targets.push(target);
            authorization = request.headers['proxy-authorization'];
            client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
            upstream.write(head);
            upstream.pipe(client);
            client.pipe(upstream);
        });

        upstream.on('error', () => client.destroy());
        upstream.on('close', () => client.destroy());
        client.on('error', () => upstream.destroy());
        client.on('close', () => upstream.destroy());
    });

    const close = closer(server);
    const port = await listening(server);

    return {
        url: `http://127.0.0.1:${String(port)}`,
        targets,
        lastAuthorization: () => authorization,
        close,
    };
}
