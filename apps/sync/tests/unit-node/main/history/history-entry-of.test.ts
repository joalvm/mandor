import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { historyEntrySchema } from '@mandor/schema';
import { bodyFile } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { historyEntryOf } from '../../../../src/main/history/history-entry-of.js';
import { HISTORY_INLINE_BYTES } from '../../../../src/main/history/history-limits.js';
import { failedSendOf, idOf, responseOf, sendOf } from './history-fixture.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-history-entry-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

const BIG = HISTORY_INLINE_BYTES + 1;

describe('the entry of a send', () => {
    it('keeps the request as it left, with the id and the time of the send', async () => {
        const entry = await historyEntryOf(
            root,
            sendOf(root, 3, {
                headers: [['X-Key', 'abc']],
                bytes: new TextEncoder().encode('{"a":1}'),
            }),
        );

        expect(historyEntrySchema.parse(entry)).toEqual(entry);
        expect(entry).toMatchObject({
            id: idOf(3),
            workspaceId: 'pagos',
            itemPath: 'pedidos/crear',
            environmentId: null,
            sentAt: '2026-09-01T00:00:03.000Z',
            request: {
                method: 'POST',
                url: 'http://localhost/pedidos',
                headers: [['X-Key', 'abc']],
                body: { kind: 'inline', encoding: 'utf8', text: '{"a":1}' },
            },
        });
    });

    it('has no body when the request sent none, or sent it empty', async () => {
        const none = await historyEntryOf(root, sendOf(root, 1));
        const empty = await historyEntryOf(root, sendOf(root, 2, { bytes: new Uint8Array() }));

        expect(none.request.body).toBeNull();
        expect(empty.request.body).toBeNull();
    });

    it('keeps bytes that are not text as base64', async () => {
        const entry = await historyEntryOf(
            root,
            sendOf(root, 1, { bytes: Uint8Array.from([0xff, 0xfe, 0x00]) }),
        );

        expect(entry.request.body).toEqual({ kind: 'inline', encoding: 'base64', data: '//4A' });
    });

    it('stores a request body past the limit and keeps its reference', async () => {
        const bytes = new Uint8Array(BIG).fill(97);
        const entry = await historyEntryOf(
            root,
            sendOf(root, 1, { bytes, headers: [['Content-Type', 'text/plain']] }),
        );

        expect(entry.request.body).toMatchObject({
            kind: 'stored',
            bytes: BIG,
            contentType: 'text/plain',
        });

        const ref = entry.request.body?.kind === 'stored' ? entry.request.body.ref : '';

        expect((await readFile(bodyFile(root, ref))).length).toBe(BIG);
    });

    it('names a stored body of unknown type as raw bytes', async () => {
        const entry = await historyEntryOf(
            root,
            sendOf(root, 1, { bytes: new Uint8Array(BIG).fill(1) }),
        );

        expect(entry.request.body).toMatchObject({ contentType: 'application/octet-stream' });
    });

    it('keeps a response body that is small, and one the transport already stored', async () => {
        const small = { kind: 'inline', encoding: 'utf8', text: 'hi' } as const;
        const spilled = {
            kind: 'stored',
            ref: 'a'.repeat(64),
            bytes: 9_000_000,
            contentType: 'video/mp4',
        } as const;
        const first = await historyEntryOf(root, sendOf(root, 1, { response: responseOf(small) }));
        const second = await historyEntryOf(
            root,
            sendOf(root, 2, { response: responseOf(spilled) }),
        );
        const third = await historyEntryOf(root, sendOf(root, 3, { response: responseOf(null) }));

        expect(first.outcome).toMatchObject({ response: { body: small } });
        expect(second.outcome).toMatchObject({ response: { body: spilled } });
        expect(third.outcome).toMatchObject({ response: { body: null } });
    });

    it('stores a response body that crossed the limit inline, whatever its encoding', async () => {
        const text = { kind: 'inline', encoding: 'utf8', text: 'x'.repeat(BIG) } as const;
        const binary = {
            kind: 'inline',
            encoding: 'base64',
            data: Buffer.alloc(BIG, 7).toString('base64'),
        } as const;
        const first = await historyEntryOf(
            root,
            sendOf(root, 1, { response: responseOf(text, [['content-type', 'text/plain']]) }),
        );
        const second = await historyEntryOf(
            root,
            sendOf(root, 2, { response: responseOf(binary) }),
        );

        expect(first.outcome).toMatchObject({
            response: { body: { kind: 'stored', bytes: BIG, contentType: 'text/plain' } },
        });
        expect(second.outcome).toMatchObject({
            response: { body: { kind: 'stored', bytes: BIG } },
        });
    });

    it('keeps the code and the message of a send that ended without a response', async () => {
        const entry = await historyEntryOf(root, failedSendOf(root, 1, 'request-timeout'));

        expect(entry.outcome).toEqual({
            kind: 'failure',
            code: 'request-timeout',
            message: 'it failed',
        });
    });
});
