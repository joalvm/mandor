import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { historyDir, historyEntryFile, historyFileName } from '../../src/history/history-path.js';
import {
    removeHistoryEntries,
    removeHistoryFiles,
} from '../../src/history/remove-history-entries.js';
import { entryOf, idOf, nameOf } from './history-entry-fixture.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

async function put(n: number): Promise<void> {
    const entry = entryOf(n);
    const name = historyFileName(entry.sentAt, entry.id);

    await mkdir(historyDir(root, 'pagos'), { recursive: true });
    await writeFile(historyEntryFile(root, 'pagos', name), JSON.stringify(entry), 'utf8');
}

describe('removing entries of the history', () => {
    it('deletes the files of the ids and leaves the rest', async () => {
        await put(1);
        await put(2);
        await put(3);

        await removeHistoryEntries(root, 'pagos', [idOf(1), idOf(3)]);

        const left = await readdir(historyDir(root, 'pagos'));

        expect(left).toHaveLength(1);
        expect(left[0]).toContain(idOf(2));
    });

    it('does not complain about an id already gone, or a folder that never was', async () => {
        await removeHistoryEntries(root, 'pagos', [idOf(1)]);
        await put(1);
        await removeHistoryEntries(root, 'pagos', [idOf(9)]);

        expect(await readdir(historyDir(root, 'pagos'))).toHaveLength(1);
    });

    it('refuses an id that is not a uuid', async () => {
        await expect(removeHistoryEntries(root, 'pagos', ['../x'])).rejects.toThrow();
    });
});

describe('removing files of the history', () => {
    /** A file that no longer parses has no id to name it by, and still has to go. */
    it('deletes the files it names, whether they parse or not, and leaves the rest', async () => {
        await put(1);
        await put(2);
        await writeFile(historyEntryFile(root, 'pagos', nameOf(3)), '{ roto', 'utf8');

        await removeHistoryFiles(root, 'pagos', [nameOf(1), nameOf(3)]);

        expect(await readdir(historyDir(root, 'pagos'))).toEqual([nameOf(2)]);
    });

    it('does not complain about a file already gone', async () => {
        await expect(removeHistoryFiles(root, 'pagos', [nameOf(1)])).resolves.toBeUndefined();
    });

    it('refuses a name that is not the file of an entry', async () => {
        await expect(removeHistoryFiles(root, 'pagos', ['mandor.yaml'])).rejects.toThrow();
    });
});
