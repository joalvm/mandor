import { mkdir, mkdtemp, readdir, rm, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FileReadError } from '../../src/disk/file-read-error.js';
import { MAX_FILE_BYTES } from '../../src/disk/read-file-text.js';
import { historyDir, historyEntryFile, historyFileName } from '../../src/history/history-path.js';
import { readHistoryEntry } from '../../src/history/read-history-entry.js';
import { entryOf, idOf } from './history-entry-fixture.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

async function put(n: number, contents?: string): Promise<void> {
    const entry = entryOf(n);
    const name = historyFileName(entry.sentAt, entry.id);

    await mkdir(historyDir(root, 'pagos'), { recursive: true });
    await writeFile(
        historyEntryFile(root, 'pagos', name),
        contents ?? JSON.stringify(entry),
        'utf8',
    );
}

describe('reading one entry of the history', () => {
    it('finds it by id, whatever time it was sent', async () => {
        await put(1);
        await put(2);

        expect(await readHistoryEntry(root, 'pagos', idOf(2))).toEqual(entryOf(2));
    });

    it('refuses with the file when the entry does not parse', async () => {
        await put(1, '{ roto');

        await expect(readHistoryEntry(root, 'pagos', idOf(1))).rejects.toBeInstanceOf(
            FileReadError,
        );
    });

    it('refuses with the file when the entry is past the cap', async () => {
        await put(1);

        const [name = ''] = await readdir(historyDir(root, 'pagos'));

        await truncate(join(historyDir(root, 'pagos'), name), MAX_FILE_BYTES + 1);

        await expect(readHistoryEntry(root, 'pagos', idOf(1))).rejects.toThrow(/64 MiB/);
    });

    it('refuses when the entry is not there, with or without a folder', async () => {
        await expect(readHistoryEntry(root, 'pagos', idOf(1))).rejects.toBeInstanceOf(
            FileReadError,
        );

        await put(1);

        await expect(readHistoryEntry(root, 'pagos', idOf(7))).rejects.toBeInstanceOf(
            FileReadError,
        );
    });

    it('refuses an id that is not a uuid before it reaches the disk', async () => {
        await expect(readHistoryEntry(root, 'pagos', '../x')).rejects.toThrow();
    });
});
