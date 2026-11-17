import type { IncomingMessage } from 'node:http';

/** What the request carried as its body, read whole. */
export async function bodyOf(request: IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];

    for await (const chunk of request) {
        chunks.push(chunk as Buffer);
    }

    return Buffer.concat(chunks).toString('utf8');
}
