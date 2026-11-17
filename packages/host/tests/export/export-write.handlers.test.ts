import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { InteropDocument } from '@mandor/interop-core';
import { CHANNELS } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { idsOf, openBench, writeOf, type ExportBench } from './export-bench.js';

let bench: ExportBench;

async function documentWritten(): Promise<InteropDocument> {
    return JSON.parse(await readFile(join(bench.dir, 'out.json'), 'utf8')) as InteropDocument;
}

beforeEach(async () => {
    bench = await openBench();
});

afterEach(async () => {
    await bench.stop();
});

describe('writing what was chosen', () => {
    it('writes, at the path the user chose, only the leaves that were marked', async () => {
        const answer = await writeOf(bench, await idsOf(bench, 'connection'));

        expect(answer).toEqual({ ok: true, value: { path: bench.chosen } });

        // The fixture format writes the model itself: what was chosen is all that is in it.
        const document = await documentWritten();

        expect(document.servers.map((server) => server.url)).toEqual([
            'wss://pasarela.ejemplo.com/v1',
        ]);
        expect(document.channels).toEqual([]);
    });

    it('leaves out a connection that was not chosen, and keeps the messages that were', async () => {
        await writeOf(bench, await idsOf(bench, 'message'));

        const document = await documentWritten();

        expect(document.servers).toEqual([]);
        expect(document.channels.map((channel) => channel.address)).toEqual(['pedidos/entrantes']);
    });

    it('offers the dialog the name of the workspace under the extension of the format', async () => {
        await writeOf(bench, await idsOf(bench, 'connection'));

        expect(bench.suggested).toEqual(['pasarela.json']);
    });

    it('writes nothing and says so when the user closed the dialog', async () => {
        bench.chosen = null;

        const answer = await writeOf(bench, await idsOf(bench, 'connection'));

        expect(answer).toEqual({ ok: true, value: { path: null } });
        await expect(readFile(join(bench.dir, 'out.json'), 'utf8')).rejects.toThrow();
    });

    it('refuses a choice with nothing in it, before the dialog opens', async () => {
        const answer = await writeOf(bench, []);

        expect(answer).toMatchObject({ ok: false, error: { code: 'bad-request' } });
        expect(bench.suggested).toEqual([]);
    });

    it('refuses a format the app did not list', async () => {
        const answer = await bench.ipc.call(CHANNELS.exportWrite, {
            workspaceId: 'pasarela',
            format: 'openapi',
            scope: 'workspace',
            chosen: ['connection/produccion'],
        });

        expect(answer).toMatchObject({ ok: false, error: { code: 'bad-request' } });
        expect(bench.suggested).toEqual([]);
    });

    it('answers that it could not save when the path cannot be written', async () => {
        // A file where a folder should be: nothing can be written inside it.
        await writeFile(join(bench.dir, 'blocker'), '', 'utf8');
        bench.chosen = join(bench.dir, 'blocker', 'out.json');

        const answer = await writeOf(bench, await idsOf(bench, 'connection'));

        expect(answer).toMatchObject({ ok: false, error: { code: 'fs-write' } });
    });
});
