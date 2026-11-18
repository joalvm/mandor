import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import http from 'node:http';
import https from 'node:https';
import net, { type AddressInfo } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The echo server the tests send against: a local `node:http` server on an ephemeral port. */
export type EchoServer = {
    /** `http://127.0.0.1:<port>` — what a SyncRequest.url points at. */
    origin: string;
    close(): Promise<void>;
};

export type EchoServerOptions = {
    /** How long `/slow` waits before answering: enough to trip a timeout smaller than it. */
    delayMs?: number;
    /** Serve TLS with the self-signed test pair: the request asks with `verify: false`. */
    https?: boolean;
    /** Demand a client certificate: the pair in `tests/support/tls/` is the one the server accepts. */
    requestCert?: boolean;
};

function pem(name: string): string {
    return readFileSync(join(fileURLToPath(new URL('.', import.meta.url)), 'tls', name), 'utf8');
}

function respond(response: http.ServerResponse, body: string): void {
    response.setHeader('x-order', 'first');
    // Two separate Set-Cookie lines: the transport must not fold them into one.
    response.setHeader('set-cookie', ['first=1; Path=/', 'second=2; Path=/']);
    response.end(body);
}

function respondEcho(request: http.IncomingMessage, response: http.ServerResponse): void {
    const chunks: Buffer[] = [];

    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
        response.setHeader('x-request-method', request.method ?? 'GET');
        response.end(Buffer.concat(chunks));
    });
}

function respondRedirect(request: http.IncomingMessage, response: http.ServerResponse): void {
    const where = new URL(request.url ?? '/redirect', 'http://x');
    const status = Number(where.searchParams.get('status') ?? 302);
    const to = where.searchParams.get('to') ?? '/';

    response.statusCode = status;
    response.setHeader('location', to);
    response.end('redirecting');
}

function respondGzipped(response: http.ServerResponse): void {
    response.setHeader('content-encoding', 'gzip');
    response.end(gzipSync(Buffer.from('repetited body '.repeat(80).trimEnd())));
}

function respondSlow(response: http.ServerResponse, delayMs: number): void {
    setTimeout(() => {
        respond(response, 'slow');
    }, delayMs);
}

function echoHandler(delayMs: number) {
    return (request: http.IncomingMessage, response: http.ServerResponse): void => {
        if (request.url === '/reset') {
            response.destroy();

            return;
        }

        if (request.url === '/slow') {
            respondSlow(response, delayMs);

            return;
        }

        if (request.url === '/echo') {
            respondEcho(request, response);

            return;
        }

        if (request.url === '/gzipped') {
            respondGzipped(response);

            return;
        }

        if (request.url?.startsWith('/redirect?') === true) {
            respondRedirect(request, response);

            return;
        }

        respond(response, 'ok');
    };
}

/**
 * Starts the server. `/` answers `ok` with repeated headers, `/echo` repeats the request,
 * `/slow` waits, `/reset` kills the socket, `/redirect` sends where the query says.
 *
 * The `https` option serves the self-signed pair of `tests/support/tls/`; `requestCert` demands
 * a client certificate.
 */
export async function startEchoServer(options: EchoServerOptions = {}): Promise<EchoServer> {
    const delayMs = options.delayMs ?? 0;
    const server =
        options.https === true
            ? https.createServer(
                  {
                      key: pem('key.pem'),
                      cert: pem('cert.pem'),
                      ...(options.requestCert === true
                          ? { requestCert: true, rejectUnauthorized: true, ca: pem('cert.pem') }
                          : {}),
                  },
                  echoHandler(delayMs),
              )
            : http.createServer(echoHandler(delayMs));

    await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });

    const port = (server.address() as AddressInfo).port;

    return {
        origin: `${options.https === true ? 'https' : 'http'}://127.0.0.1:${String(port)}`,
        // Closing twice is not an error for the tests: the afterEach and a test that closes
        // its own server both call this, and the second close must not fail the suite.
        close: () =>
            new Promise<void>((resolve, reject) => {
                server.close((error) => {
                    if (
                        error === undefined ||
                        (error as NodeJS.ErrnoException).code === 'ERR_SERVER_NOT_RUNNING'
                    ) {
                        resolve();

                        return;
                    }

                    reject(error);
                });
            }),
    };
}

/** A TCP server that accepts and stays silent: the transport's connect timeout fires against it. */
export async function startSilentServer(): Promise<{ port: number; close(): Promise<void> }> {
    const accepted = new Set<net.Socket>();
    const server = net.createServer((socket) => {
        accepted.add(socket);
        socket.on('close', () => accepted.delete(socket));
    });

    await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });

    const port = (server.address() as AddressInfo).port;

    return {
        port,
        close: () =>
            new Promise<void>((resolve) => {
                // The socket a test left stuck mid-handshake would hold `close` open forever.
                for (const socket of accepted) {
                    socket.destroy();
                }

                server.close(() => {
                    resolve();
                });
            }),
    };
}
