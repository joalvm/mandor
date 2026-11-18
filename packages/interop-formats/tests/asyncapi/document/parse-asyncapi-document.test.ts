import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import { AsyncapiParseError } from '../../../src/asyncapi/document/asyncapi-parse-error.js';
import { parseAsyncapiDocument } from '../../../src/asyncapi/document/parse-asyncapi-document.js';

/** A document whose one message takes its payload from `ref`. */
function payloadFrom(ref: string): string {
    return JSON.stringify({
        asyncapi: '3.0.0',
        info: { title: 't', version: '1' },
        channels: { c: { address: 'c', messages: { m: { payload: { $ref: ref } } } } },
    });
}

/** The `$ref` the payload of that message holds once parsed, if it holds one. */
function payloadRefOf(raw: Record<string, unknown>): unknown {
    const path = ['channels', 'c', 'messages', 'm', 'payload', '$ref'];

    return path.reduce<unknown>(
        (node, key) =>
            typeof node === 'object' && node !== null ? Reflect.get(node, key) : undefined,
        raw,
    );
}

describe('parseAsyncapiDocument', () => {
    it('hands back the model and the parsed object as it was written', async () => {
        const { document, raw } = await parseAsyncapiDocument(
            JSON.stringify({ asyncapi: '3.0.0', info: { title: 't', version: '1' }, channels: {} }),
        );

        expect(document.info().title()).toBe('t');
        expect(raw['asyncapi']).toBe('3.0.0');
    });

    it('refuses a document that does not meet the specification, saying what is wrong', async () => {
        const rejection: unknown = await parseAsyncapiDocument(
            JSON.stringify({
                asyncapi: '3.0.0',
                info: { title: 't', version: '1' },
                channels: {},
                components: {
                    securitySchemes: { s: { type: 'apiKey', in: 'query', name: 'token' } },
                },
            }),
        ).then(
            () => {
                throw new Error('the document should not have parsed');
            },
            (reason: unknown) => reason,
        );

        expect(rejection).toBeInstanceOf(AsyncapiParseError);
        expect((rejection as AsyncapiParseError).problems.length).toBeGreaterThan(0);
    });

    /** A document is data: the file a reference names is someone else's choice of file. */
    it('reads no file an external $ref names, and keeps the reference', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'mandor-'));
        const named = join(dir, 'payload.json');

        await writeFile(named, JSON.stringify({ type: 'string', description: 'on disk' }), 'utf8');

        try {
            const { raw } = await parseAsyncapiDocument(payloadFrom(pathToFileURL(named).href));

            expect(JSON.stringify(raw)).not.toContain('on disk');
            expect(String(payloadRefOf(raw))).toContain('payload.json');
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });

    it('asks the network for nothing an external $ref names', async () => {
        let asked = 0;
        const server = createServer((_request, response) => {
            asked += 1;
            response.end(JSON.stringify({ type: 'string' }));
        });

        server.listen(0, '127.0.0.1');
        await once(server, 'listening');

        try {
            const address = server.address();
            const port = typeof address === 'object' && address !== null ? address.port : 0;
            const ref = `http://127.0.0.1:${String(port)}/payload.json`;
            const { raw } = await parseAsyncapiDocument(payloadFrom(ref));

            expect(asked).toBe(0);
            expect(payloadRefOf(raw)).toBe(ref);
        } finally {
            server.close();
        }
    });

    it('refuses text that is not a document at all', async () => {
        await expect(
            async () => await parseAsyncapiDocument('esto no es un documento'),
        ).rejects.toBeInstanceOf(AsyncapiParseError);
    });
});
