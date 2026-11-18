import net, { type AddressInfo } from 'node:net';

export type SocksProxy = {
    url: string;
    /** The `host:port` each tunnel asked for, in the order they arrived. */
    targets: string[];
    close: () => Promise<void>;
};

const VERSION = 0x05;
const NO_AUTH = 0x00;
const DOMAIN = 0x03;
const IPV4 = 0x01;

/** The `host:port` of a SOCKS5 CONNECT, IPv4 or domain, the two a client sends here. */
function targetOf(request: Buffer): string {
    const kind = request[3];
    const port = request.readUInt16BE(request.length - 2);

    if (kind === DOMAIN) {
        const length = request[4] ?? 0;

        return `${request.subarray(5, 5 + length).toString('latin1')}:${String(port)}`;
    }

    if (kind === IPV4) {
        return `${[...request.subarray(4, 8)].join('.')}:${String(port)}`;
    }

    return `unsupported:${String(port)}`;
}

/**
 * A SOCKS5 proxy with no auth that only CONNECTs, enough to prove a socket tunnels through it:
 * greeting, the request, then bytes both ways.
 */
export async function startSocksProxy(): Promise<SocksProxy> {
    const targets: string[] = [];
    const open = new Set<net.Socket>();
    const server = net.createServer((client) => {
        open.add(client);
        client.on('close', () => open.delete(client));
        client.on('error', () => undefined);
        client.once('data', () => {
            client.write(Buffer.from([VERSION, NO_AUTH]));
            client.once('data', (request: Buffer) => {
                const target = targetOf(request);
                const [host = '', port = '0'] = target.split(':');
                const upstream = net.connect(Number(port), host, () => {
                    targets.push(target);
                    client.write(Buffer.from([VERSION, 0, 0, IPV4, 0, 0, 0, 0, 0, 0]));
                    upstream.pipe(client);
                    client.pipe(upstream);
                });

                upstream.on('error', () => client.destroy());
                upstream.on('close', () => client.destroy());
                client.on('close', () => upstream.destroy());
            });
        });
    });

    await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });

    return {
        url: `socks5://127.0.0.1:${String((server.address() as AddressInfo).port)}`,
        targets,
        close: () =>
            new Promise<void>((resolve) => {
                for (const socket of open) {
                    socket.destroy();
                }

                server.close(() => {
                    resolve();
                });
            }),
    };
}
