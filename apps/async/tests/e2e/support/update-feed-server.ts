import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { basename, join } from 'node:path';

/** Where the installers of the pair look for a version; the same address is built into them. */
const FEED_PORT = 47613;

export type FeedServer = {
    /** The path of every request that reached the server, in order, whether it was served or not. */
    requests: string[];
    close: () => Promise<void>;
};

/**
 * Serves the files of one folder, flat, and nothing else: `GET` only, and a name is looked up in
 * the folder by its last segment, so no path leaves it. That is all a generic feed asks of a host.
 */
export async function serveFeed(directory: string, port = FEED_PORT): Promise<FeedServer> {
    const requests: string[] = [];
    const server = createServer((request, response) => {
        const path = decodeURIComponent((request.url ?? '/').split('?')[0] ?? '/');

        requests.push(path);

        if (request.method !== 'GET') {
            response.writeHead(405).end();

            return;
        }

        const file = join(directory, basename(path));

        stat(file)
            .then((found) => {
                if (!found.isFile()) {
                    throw new Error('not a file');
                }

                response.writeHead(200, { 'Content-Length': found.size });
                createReadStream(file).pipe(response);
            })
            .catch(() => {
                response.writeHead(404).end();
            });
    });

    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', resolve);
    });

    return {
        requests,
        close: () =>
            new Promise<void>((resolve) => {
                server.close(() => {
                    resolve();
                });
                server.closeAllConnections();
            }),
    };
}
