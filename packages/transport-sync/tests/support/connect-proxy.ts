import net, { type AddressInfo } from 'node:net';

/**
 * A minimal HTTP CONNECT proxy: it answers the tunnel request and then pipes bytes both ways,
 * nothing else. Enough for the transport to prove it can send through a proxy, not enough to
 * be one.
 */
export type ConnectProxy = {
    /** `http://127.0.0.1:<port>` — what a SyncRequest.proxy.url points at. */
    origin: string;
    /** How many CONNECT requests arrived. */
    tunnels: () => number;
    close(): Promise<void>;
};

export async function startConnectProxy(): Promise<ConnectProxy> {
    let tunnels = 0;
    const server = net.createServer((client) => {
        let buffered = '';

        client.on('data', function onData(chunk: Buffer): void {
            buffered += chunk.toString('latin1');

            const end = buffered.indexOf('\r\n\r\n');

            if (end === -1) {
                return;
            }

            client.removeListener('data', onData);

            const requestLine = buffered.slice(0, buffered.indexOf('\r\n'));
            const target = requestLine.split(' ')[1] ?? '';
            const [host, port] = target.split(':');
            const upstream = net.connect(Number(port ?? 443), host ?? 'localhost');

            upstream.once('error', () => client.destroy());
            upstream.once('connect', () => {
                tunnels += 1;
                client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
                const rest = buffered.slice(end + 4);

                if (rest.length > 0) {
                    upstream.write(Buffer.from(rest, 'latin1'));
                }

                upstream.pipe(client);
                client.pipe(upstream);
            });
        });
    });

    await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });

    const port = (server.address() as AddressInfo).port;
    const open = new Set<net.Socket>();

    server.on('connection', (socket) => {
        open.add(socket);
        socket.on('close', () => open.delete(socket));
    });

    return {
        origin: `http://127.0.0.1:${String(port)}`,
        tunnels: () => tunnels,
        close: () =>
            new Promise<void>((resolve) => {
                // The tunnel a test left open would hold `close` forever.
                for (const socket of open) {
                    socket.destroy();
                }

                server.close(() => {
                    resolve();
                });
            }),
    };
}
