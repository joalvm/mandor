import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CHANNELS, IMPORT_PROGRESS_EVERY } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerImportHandlers } from '../../src/import/import.handlers.js';
import { readInThread } from '../../src/import/read-import.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { fixtureFormat } from '../interop/fixture-format.js';

let dir: string;
let ipc: IpcSpy;
let dispose: () => void;
/** What the dialog answers, and the kind of input the handler asked it for. */
let answer: readonly string[] | null;
let asked: string[];
let pushed: unknown[];
let onPush: () => void;

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mandor-pick-'));
    ipc = spyIpc();
    answer = null;
    asked = [];
    pushed = [];
    onPush = () => undefined;
    dispose = registerImportHandlers(ipc, {
        chooseDocument: (input) => {
            asked.push(input);

            return Promise.resolve(answer);
        },
        formats: [fixtureFormat],
        readImport: readInThread,
        stores: ['message', 'connection'],
        userDataDir: '',
        folderSettings: ['description', 'variables'],
        kind: 'async',
        target: {
            isDestroyed: () => false,
            webContents: {
                send: (channel, message) => {
                    pushed.push([channel, message]);
                    onPush();
                },
            },
        },
    });
});

afterEach(async () => {
    dispose();
    await rm(dir, { recursive: true, force: true });
});

describe('picking what to import', () => {
    it('asks the dialog for the kind of input the renderer named, and reads what it answers', async () => {
        await writeFile(join(dir, 'api.json'), '{"resources": []}', 'utf8');
        answer = [join(dir, 'api.json')];

        const picked = await ipc.call(CHANNELS.importPick, { input: 'files' });

        expect(asked).toEqual(['files']);
        expect(picked).toEqual({
            ok: true,
            value: { files: [{ path: 'api.json', text: '{"resources": []}' }] },
        });
    });

    it('says the read began, and how it goes every so many files', async () => {
        await Promise.all(
            Array.from({ length: IMPORT_PROGRESS_EVERY }, (_, index) =>
                writeFile(join(dir, `${String(index)}.json`), 'x', 'utf8'),
            ),
        );
        answer = [dir];

        await ipc.call(CHANNELS.importPick, { input: 'folder' });

        expect(pushed).toEqual([
            [CHANNELS.importProgress, { files: 0 }],
            [CHANNELS.importProgress, { files: IMPORT_PROGRESS_EVERY }],
        ]);
    });

    it('answers no files, and no failure, when the person stops the read', async () => {
        await writeFile(join(dir, 'api.json'), '{"resources": []}', 'utf8');
        answer = [join(dir, 'api.json')];

        // Stopped as it begins: a file this small is read before any later moment comes.
        onPush = () => {
            void ipc.call(CHANNELS.importCancel, undefined);
        };

        await expect(ipc.call(CHANNELS.importPick, { input: 'files' })).resolves.toEqual({
            ok: true,
            value: { files: null },
        });
    });

    it('answers no files, and no failure, when the user closed the dialog', async () => {
        const picked = await ipc.call(CHANNELS.importPick, { input: 'file' });

        expect(picked).toEqual({ ok: true, value: { files: null } });
    });

    it('answers the failure when what was picked cannot be read', async () => {
        answer = [join(dir, 'gone.json')];

        const picked = await ipc.call(CHANNELS.importPick, { input: 'file' });

        expect(picked).toMatchObject({ ok: false });
    });

    it('refuses a request that names no input before any dialog opens', async () => {
        const picked = await ipc.call(CHANNELS.importPick, {});

        expect(picked).toMatchObject({ ok: false, error: { code: 'bad-request' } });
        expect(asked).toEqual([]);
    });
});
