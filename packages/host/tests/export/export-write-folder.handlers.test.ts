import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CHANNELS } from '@mandor/ipc';
import type { InteropFormat } from '@mandor/interop-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { fixtureFormat } from '../interop/fixture-format.js';
import { idsOf, openBench, type ExportBench } from './export-bench.js';

let bench: ExportBench;

/** A format that writes a file per kind of leaf, so one export carries several files. */
const severalFormat: InteropFormat = {
    ...fixtureFormat,
    id: 'several',
    load: () =>
        Promise.resolve({
            read: () => Promise.reject(new Error('writes only')),
            documentsOf: (data) => [
                { path: 'main.json', document: { name: data.name } },
                { path: 'parts/connections.json', document: { count: data.connections.length } },
            ],
            textOf: (document) => JSON.stringify(document),
        }),
};

async function writeSeveral(ids: string[]): Promise<unknown> {
    return bench.ipc.call(CHANNELS.exportWrite, {
        workspaceId: 'pasarela',
        format: 'several',
        scope: 'workspace',
        chosen: ids,
    });
}

beforeEach(async () => {
    bench = await openBench([fixtureFormat, severalFormat]);
});

afterEach(async () => {
    await bench.stop();
});

describe('writing several files', () => {
    it('asks for a folder, not for a name, and writes each file at its path inside it', async () => {
        const folder = join(bench.dir, 'out');

        await mkdir(folder);
        bench.folder = folder;

        const answer = await writeSeveral(await idsOf(bench, 'connection'));

        expect(answer).toEqual({ ok: true, value: { path: folder } });
        expect(bench.suggested).toEqual([]);
        await expect(readFile(join(folder, 'main.json'), 'utf8')).resolves.toBe(
            '{"name":"Pasarela"}',
        );
        await expect(readFile(join(folder, 'parts', 'connections.json'), 'utf8')).resolves.toBe(
            '{"count":1}',
        );
    });

    it('writes nothing and says so when the user closed the folder dialog', async () => {
        bench.folder = null;

        const answer = await writeSeveral(await idsOf(bench, 'connection'));

        expect(answer).toEqual({ ok: true, value: { path: null } });
    });

    it('answers that it could not save when the folder cannot be written', async () => {
        // A file where a folder should be: nothing can be made inside it.
        await writeFile(join(bench.dir, 'blocker'), '', 'utf8');
        bench.folder = join(bench.dir, 'blocker', 'inside');

        const answer = await writeSeveral(await idsOf(bench, 'connection'));

        expect(answer).toMatchObject({ ok: false, error: { code: 'fs-write' } });
    });
});
