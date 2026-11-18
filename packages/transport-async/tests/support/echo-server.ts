import { WebSocketServer, type WebSocket } from 'ws';

export type EchoServer = {
    /** ws:// URL on an ephemeral loopback port, ready to hand to a client. */
    readonly url: string;
    /** Headers of the last upgrade request, so a test can check what the client sent. */
    lastHeaders(): Record<string, string | string[] | undefined>;
    /** Subprotocol negotiated with the last connected client. Empty when none was offered. */
    lastProtocol(): string;
    /** How many pings the clients have sent, so a test can watch a keepalive beat. */
    pingCount(): number;
    /** Clients still connected, so a test can watch a socket die. */
    clientCount(): number;
    /** Sends one binary frame to every client, the way a server push looks. */
    broadcastBinary(bytes: Uint8Array): void;
    /** Sends one text frame to every client, the way a stream of events looks. */
    broadcastText(text: string): void;
    /** Closes every client with the given code, the way a server-initiated shutdown looks. */
    closeClients(code: number): void;
    /** Terminates clients and stops listening; the port is free once this resolves. */
    close(): Promise<void>;
};

/**
 * A local echo server for the suite and for the e2e of apps/async. Loopback only, ephemeral
 * port by default, zero external network: a test that needs the internet is a test that
 * flakes in CI. A test that simulates a server coming back up passes the old port back in,
 * since a client that already dialed it has no other way to find it again.
 */
export async function startEchoServer(port = 0): Promise<EchoServer> {
    const server = new WebSocketServer({
        host: '127.0.0.1',
        port,
        // Accept the first subprotocol the client offers, so a test can see the negotiation.
        handleProtocols: (offered) => [...offered][0] ?? false,
    });
    const clients = new Set<WebSocket>();
    let headers: Record<string, string | string[] | undefined> = {};
    let protocol = '';
    let pings = 0;

    server.on('connection', (socket, request) => {
        clients.add(socket);
        headers = request.headers;
        protocol = socket.protocol;
        socket.on('ping', () => {
            pings += 1;
        });
        socket.on('message', (data: Buffer, isBinary: boolean) => {
            socket.send(data, { binary: isBinary });
        });
        socket.on('close', () => {
            clients.delete(socket);
        });
    });

    await new Promise<void>((resolve) => {
        server.on('listening', resolve);
    });

    const address = server.address();

    if (address === null || typeof address === 'string') {
        throw new Error('echo server is not listening on a TCP port');
    }

    return {
        url: `ws://127.0.0.1:${String(address.port)}`,
        lastHeaders: () => headers,
        lastProtocol: () => protocol,
        pingCount: () => pings,
        clientCount: () => clients.size,
        broadcastBinary: (bytes: Uint8Array) => {
            for (const client of clients) {
                client.send(bytes, { binary: true });
            }
        },
        broadcastText: (text: string) => {
            for (const client of clients) {
                client.send(text);
            }
        },
        closeClients: (code: number) => {
            for (const client of clients) {
                client.close(code);
            }
        },
        close: async () => {
            for (const client of clients) {
                client.terminate();
            }

            await new Promise<void>((resolve, reject) => {
                server.close((error) => {
                    if (error === undefined) {
                        resolve();

                        return;
                    }

                    reject(error);
                });
            });
        },
    };
}
