import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import createV2Server from 'socket.io-v2';

export type SocketIoV2Server = {
    url: string;
    /** The query the last client dialled with: where a v2 server reads its auth. */
    lastQuery: () => Record<string, unknown> | undefined;
    close: () => Promise<void>;
};

type V2Socket = {
    handshake: { query: Record<string, unknown> };
    use: (middleware: (packet: unknown[], next: () => void) => void) => void;
    emit: (event: string | number, ...args: unknown[]) => void;
};

const NUMBERED = new Map([['numbered', [7]]]);

/**
 * A Socket.IO v2 server, the protocol before v3: every named event comes back to its sender,
 * and one that asks for an answer is answered through its ack instead.
 */
export async function startSocketIoV2Server(): Promise<SocketIoV2Server> {
    const http = createServer();
    const server = createV2Server(http);
    let query: Record<string, unknown> | undefined;

    server.on('connection', (socket: V2Socket) => {
        query = socket.handshake.query;
        // v2 had no catch-all listener: a middleware sees every named event, ack included.
        socket.use((packet, next) => {
            const [event, ...args] = packet;
            const ack = args.at(-1);

            if (typeof ack === 'function') {
                (ack as (...reply: unknown[]) => void)(...args.slice(0, -1));
            } else if (typeof event === 'string') {
                // `numbered` is first answered under a number, a name v2 never forbade.
                NUMBERED.get(event)?.forEach((name) => {
                    socket.emit(name, ...args);
                });
                socket.emit(event, ...args);
            }

            next();
        });
    });

    await new Promise<void>((resolve) => {
        http.listen(0, '127.0.0.1', resolve);
    });

    return {
        url: `http://127.0.0.1:${String((http.address() as AddressInfo).port)}`,
        lastQuery: () => query,
        close: () =>
            new Promise<void>((resolve) => {
                server.close(() => {
                    resolve();
                });
            }),
    };
}
