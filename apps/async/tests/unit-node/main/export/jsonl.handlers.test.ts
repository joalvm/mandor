import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { rememberSessionSecrets } from '@mandor/host';
import { forgetSecrets, spyIpc, type IpcSpy } from '@mandor/host/testing';
import { CHANNELS } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerJsonlExportHandlers } from '../../../../src/main/export/jsonl.handlers.js';

let ipc: IpcSpy;
let dispose: () => void;
let dir: string;
let chosen: string | null;
let suggested: string[];

function call(payload: unknown): Promise<unknown> {
    return ipc.call(CHANNELS.exportJsonl, payload);
}

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mandor-export-'));
    ipc = spyIpc();
    suggested = [];
    chosen = join(dir, 'activity.jsonl');
    dispose = registerJsonlExportHandlers(ipc, {
        chooseSavePath: (name) => {
            suggested.push(name);

            return Promise.resolve(chosen);
        },
    });
});

afterEach(async () => {
    dispose();
    forgetSecrets();
    await rm(dir, { recursive: true, force: true });
});

describe('exporting a batch of records', () => {
    it('writes one redacted line per record at the path the user chose', async () => {
        rememberSessionSecrets(['tok_abcdefgh']);

        const answer = await call({
            suggestedName: 'activity.jsonl',
            records: [{ text: 'Bearer tok_abcdefgh' }, { text: 'plain' }],
        });

        expect(answer).toEqual({ ok: true, value: { path: chosen } });
        expect(suggested).toEqual(['activity.jsonl']);

        const written = await readFile(join(dir, 'activity.jsonl'), 'utf8');

        expect(written).toBe('{"text":"Bearer [redacted]"}\n{"text":"plain"}\n');
    });

    it('writes nothing and says so when the user closed the dialog', async () => {
        chosen = null;

        const answer = await call({ suggestedName: 'activity.jsonl', records: [{ text: 'x' }] });

        expect(answer).toEqual({ ok: true, value: { path: null } });
        await expect(readFile(join(dir, 'activity.jsonl'), 'utf8')).rejects.toThrow();
    });

    it('refuses a request that does not match the contract', async () => {
        const answer = await call({ records: [{ text: 'x' }] });

        expect(answer).toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('answers with the failure of the disk when the file cannot be written', async () => {
        chosen = join(dir, 'missing', 'activity.jsonl');

        const answer = await call({ suggestedName: 'activity.jsonl', records: [{ text: 'x' }] });

        expect(answer).toMatchObject({ ok: false, error: { code: 'fs-write' } });
    });
});
