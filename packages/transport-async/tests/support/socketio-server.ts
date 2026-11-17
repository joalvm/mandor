import { createServer } from 'node:http';
import { Server, type Socket } from 'socket.io';

export type SocketIoServer = {
    /** http:// URL on an ephemeral loopback port, ready to hand to a client. */
    readonly url: string;
    /** Clients still connected, so a test can watch a socket die. */
    clientCount(): number;
    /** Emits one named event to every client, the way a server push looks. */
    broadcast(event: string, data?: unknown): void;
    /** Names one event the server neither echoes nor answers, the way a silent peer looks. */
    ignore(event: string): void;
    /** Names one event the server receives and acks with no payload, the way a laconic peer does. */
    ackEmpty(event: string): void;
    /** What the last client sent with its handshake: headers, query and auth. */
    lastHandshake(): Handshake | undefined;
    /** Disconnects every client and stops listening; the port is free once this resolves. */
    close(): Promise<void>;
};

type Handshake = {
    headers: Record<string, string | string[] | undefined>;
    query: Record<string, unknown>;
    auth: Record<string, unknown>;
};

/**
 * A local Socket.IO server for the suite. Loopback only, ephemeral port, zero external
 * network: a test that needs the internet is a test that flakes in CI.
 *
 * Every named event a client emits comes back to it — the echo a test can wait for. An
 * emission that carries an ack function is answered through that ack instead, and nothing
 * is echoed, so a test sees exactly one reply per emission either way.
 */
export async function startSocketIoServer(port?: number): Promise<SocketIoServer> {
    const http = createServer();
    const server = new Server(http);
    const clients = new Set<Socket>();
    const ignored = new Set<string>();
    const emptyAcked = new Set<string>();
    let closed = false;
    let handshake: Handshake | undefined;

    // Every namespace the client may join speaks the same echo, the way a small real server
    // would: the root one every server exposes, plus any single-segment one a test names.
    const wire = (socket: Socket): void => {
        clients.add(socket);
        handshake = {
            headers: socket.handshake.headers,
            query: socket.handshake.query,
            auth: socket.handshake.auth,
        };

        socket.onAny((event: string, ...raw: unknown[]) => {
            const ack = raw.at(-1);

            if (ignored.has(event)) {
                return;
            }

            if (isAck(ack)) {
                if (emptyAcked.has(event)) {
                    ack();

                    return;
                }

                ack(...raw.slice(0, -1));

                return;
            }

            emitNamed(socket)(event, ...raw);
        });

        socket.on('disconnect', () => {
            clients.delete(socket);
        });
    };

    server.on('connection', wire);
    server.of(/^\/[\w-]+$/u).on('connection', wire);

    await new Promise<void>((resolve) => {
        void http.listen(port ?? 0, '127.0.0.1', resolve);
    });

    const address = http.address();

    if (address === null || typeof address === 'string') {
        throw new Error('socket.io server is not listening on a TCP port');
    }

    return {
        url: `http://127.0.0.1:${String(address.port)}`,
        clientCount: () => clients.size,
        broadcast: (event, data) => {
            if (data === undefined) {
                emitNamed(server)(event);

                return;
            }

            emitNamed(server)(event, data);
        },
        ignore: (event) => {
            ignored.add(event);
        },
        ackEmpty: (event) => {
            emptyAcked.add(event);
        },
        lastHandshake: () => handshake,
        close: async () => {
            // A test closes it and the teardown closes it again: closing twice is the same as
            // closing once, so the port ends free either way.
            if (closed) {
                return;
            }

            closed = true;

            for (const socket of clients) {
                socket.disconnect(true);
            }

            await new Promise<void>((resolve, reject) => {
                void server.close((error: Error | undefined) => {
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

/** An emission that asks for an answer carries its ack function as the last argument. */
function isAck(value: unknown): value is (...reply: unknown[]) => void {
    return typeof value === 'function';
}

/**
 * socket.io types every emit as loose as the protocol allows, and the suite speaks exactly
 * event names and payloads it owns: the loose surface is narrowed once, here, not at each call.
 */
function emitNamed(emitter: Socket | Server): (event: string, ...data: unknown[]) => void {
    return emitter.emit.bind(emitter) as (event: string, ...data: unknown[]) => void;
}
