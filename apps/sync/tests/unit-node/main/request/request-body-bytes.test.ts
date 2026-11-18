import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { requestBodyBytes } from '../../../../src/main/request/request-body-bytes.js';
import type { ResolvedBody } from '../../../../src/main/request/request-templates.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-body-bytes-'));
    await mkdir(join(root, 'files'));
    await writeFile(join(root, 'files', 'logo.png'), Buffer.from([137, 80, 78, 71]));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

function send(body: ResolvedBody, headers: [string, string][] = []) {
    return requestBodyBytes(root, body, headers);
}

function text(bytes: Uint8Array | undefined): string {
    return new TextDecoder().decode(bytes);
}

describe('the bytes and the content type of a request body', () => {
    it('sends no bytes and adds no header when there is no body', async () => {
        expect(await send({ type: 'none' })).toEqual({ bytes: undefined, headers: [] });
    });

    it.each([
        ['json', 'application/json'],
        ['xml', 'application/xml'],
        ['text', 'text/plain; charset=utf-8'],
    ] as const)('sends a %s body as utf-8 with the type it implies', async (type, contentType) => {
        const sent = await send({ type, content: '{"é":1}' });

        expect(text(sent.bytes)).toBe('{"é":1}');
        expect(sent.headers).toEqual([['content-type', contentType]]);
    });

    it('lets the content type the user wrote win, whatever its case', async () => {
        const sent = await send({ type: 'json', content: '{}' }, [
            ['Content-Type', 'application/vnd.api+json'],
        ]);

        expect(sent.headers).toEqual([['Content-Type', 'application/vnd.api+json']]);
    });

    it('encodes urlencoded fields, spaces and reserved characters included', async () => {
        const sent = await send({
            type: 'urlencoded',
            fields: [
                ['a b', 'c&d'],
                ['e', ''],
            ],
        });

        expect(text(sent.bytes)).toBe('a+b=c%26d&e=');
        expect(sent.headers).toEqual([['content-type', 'application/x-www-form-urlencoded']]);
    });

    it('sends the file of the repo a binary body names, with no type of its own', async () => {
        const sent = await send({ type: 'binary', file: 'files/logo.png' });

        expect([...(sent.bytes ?? [])]).toEqual([137, 80, 78, 71]);
        expect(sent.headers).toEqual([]);
    });

    it('builds a multipart body with the boundary in its content type', async () => {
        const sent = await send({
            type: 'form',
            fields: [
                { key: 'name', value: 'Ana', kind: 'text' },
                { key: 'logo', value: 'files/logo.png', kind: 'file' },
            ],
        });
        const contentType = sent.headers.find(([name]) => name === 'content-type')?.[1] ?? '';

        expect(contentType).toMatch(/^multipart\/form-data; boundary=/);
        expect(text(sent.bytes)).toContain('name="logo"; filename="logo.png"');
        expect(text(sent.bytes)).toContain('Ana');
    });

    it('fails when a file of the form is outside the repo', async () => {
        await expect(
            send({ type: 'form', fields: [{ key: 'f', value: '../x', kind: 'file' }] }),
        ).rejects.toThrow();
    });
});
