import { readFileSync } from 'node:fs';
import http2 from 'node:http2';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

/** The local `node:http2` server the tests negotiate `h2` against: no HTTP/1.1 fallback. */
export type H2Server = {
    origin: string;
    close(): Promise<void>;
};

function pem(name: string): string {
    return readFileSync(join(fileURLToPath(new URL('.', import.meta.url)), 'tls', name), 'utf8');
}

/** `allowHTTP1` lets a client that offers only `http/1.1` in; by default the server speaks h2 alone. */
export async function startH2Server({ allowHTTP1 = false } = {}): Promise<H2Server> {
    const server = http2.createSecureServer(
        { key: pem('key.pem'), cert: pem('cert.pem'), allowHTTP1 },
        (request, response) => {
            if (request.url === '/gzipped') {
                response.writeHead(200, { 'content-encoding': 'gzip', 'x-served-by': 'h2' });
                response.end(gzipSync('gzipped over h2'));

                return;
            }

            response.end('ok');
        },
    );

    await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;

    return {
        origin: `https://127.0.0.1:${String(port)}`,
        close: () =>
            new Promise<void>((resolve, reject) => {
                server.close((error) => {
                    if (error) {
                        reject(error);

                        return;
                    }

                    resolve();
                });
            }),
    };
}
