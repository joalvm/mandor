import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    historiesDir,
    historyDir,
    historyEntryFile,
    historyFileName,
} from '../../src/history/history-path.js';
import {
    historyFileNames,
    historySpelling,
    historyWorkspaceIds,
    listHistory,
    readHistoryFiles,
    shapeHistory,
} from '../../src/history/list-history.js';
import { entryOf, idOf, nameOf, stored } from './history-entry-fixture.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

async function put(n: number, entry = entryOf(n)): Promise<void> {
    const name = historyFileName(entry.sentAt, entry.id);

    await mkdir(historyDir(root, 'pagos'), { recursive: true });
    await writeFile(historyEntryFile(root, 'pagos', name), JSON.stringify(entry), 'utf8');
}

describe('listing the history of a workspace', () => {
    it('returns the newest first', async () => {
        await put(1);
        await put(3);
        await put(2);

        const listed = await listHistory(root, 'pagos');

        expect(listed.entries.map((entry) => entry.id)).toEqual([idOf(3), idOf(2), idOf(1)]);
        expect(listed.warnings).toEqual([]);
    });

    it('returns nothing when the workspace has never sent', async () => {
        expect(await listHistory(root, 'pagos')).toEqual({ entries: [], warnings: [] });
    });

    it('turns a file that does not parse into a warning and keeps going', async () => {
        await put(1);
        await writeFile(
            historyEntryFile(root, 'pagos', historyFileName('2026-09-02T00:00:00.000Z', idOf(2))),
            '{ roto',
            'utf8',
        );
        await writeFile(
            historyEntryFile(root, 'pagos', historyFileName('2026-09-03T00:00:00.000Z', idOf(3))),
            JSON.stringify({ id: idOf(3) }),
            'utf8',
        );

        const listed = await listHistory(root, 'pagos');

        expect(listed.entries.map((entry) => entry.id)).toEqual([idOf(1)]);
        expect(listed.warnings).toHaveLength(2);
    });

    it('ignores what is not the file of an entry', async () => {
        await put(1);
        await writeFile(join(historyDir(root, 'pagos'), 'notas.txt'), 'x', 'utf8');
        await writeFile(
            join(historyDir(root, 'pagos'), `20260901T000001000Z-${idOf(1)}.json.tmp`),
            'x',
            'utf8',
        );

        const listed = await listHistory(root, 'pagos');

        expect(listed.entries).toHaveLength(1);
        expect(listed.warnings).toEqual([]);
    });
});

describe('the names of the history', () => {
    /** Pruning decides on names alone: the time of the send is the start of each one. */
    it('lists the files of the entries newest first, without opening them', async () => {
        await put(1);
        await put(3);
        await put(2);
        await writeFile(historyEntryFile(root, 'pagos', nameOf(4)), '{ roto', 'utf8');
        await writeFile(join(historyDir(root, 'pagos'), 'notas.txt'), 'x', 'utf8');

        expect(await historyFileNames(root, 'pagos')).toEqual([
            nameOf(4),
            nameOf(3),
            nameOf(2),
            nameOf(1),
        ]);
    });

    it('lists nothing for a workspace that has never sent', async () => {
        expect(await historyFileNames(root, 'pagos')).toEqual([]);
    });
});

describe('reading some entries of the history', () => {
    it('opens only the files it is given', async () => {
        await put(1);
        await put(2);

        const read = await readHistoryFiles(root, 'pagos', [nameOf(2)]);

        expect(read.entries.map((entry) => entry.id)).toEqual([idOf(2)]);
        expect(read.warnings).toEqual([]);
    });

    it('refuses a name that is not the file of an entry', async () => {
        await expect(readHistoryFiles(root, 'pagos', ['../mandor.yaml'])).rejects.toThrow();
    });
});

describe('the history of a workspace, shaped as it is read', () => {
    it('keeps what the shape takes of each entry, newest first, and leaves out a broken file', async () => {
        await put(1);
        await put(2);
        await writeFile(historyEntryFile(root, 'pagos', nameOf(3)), '{ roto', 'utf8');

        await expect(shapeHistory(root, 'pagos', (entry) => entry.id)).resolves.toEqual([
            idOf(2),
            idOf(1),
        ]);
    });
});

describe('the entries of the history that spell a word', () => {
    const NAMED = 'a'.repeat(64);

    it('are the ones whose file spells it, parsed, and no other', async () => {
        await put(1, entryOf(1, { response: stored(NAMED) }));
        await put(2, entryOf(2, { response: stored('b'.repeat(64)) }));
        await put(3);

        const found = await historySpelling(root, 'pagos', [NAMED]);

        expect(found.map((entry) => entry.id)).toEqual([idOf(1)]);
    });

    it('leave out a file that spells the word but does not parse', async () => {
        await put(2);
        await writeFile(historyEntryFile(root, 'pagos', nameOf(1)), `{ "${NAMED}"`, 'utf8');

        await expect(historySpelling(root, 'pagos', [NAMED])).resolves.toEqual([]);
    });

    it('are none for no word, without listing the folder', async () => {
        await expect(historySpelling(root, 'pagos', [])).resolves.toEqual([]);
    });
});

describe('the workspaces of an origin that kept a history', () => {
    it('are the folders named as a workspace, and nothing else in there', async () => {
        await put(1);
        await mkdir(historyDir(root, 'envios'), { recursive: true });
        await mkdir(join(historiesDir(root), 'No Es'), { recursive: true });
        await writeFile(join(historiesDir(root), 'suelto'), '', 'utf8');

        expect((await historyWorkspaceIds(root)).sort()).toEqual(['envios', 'pagos']);
    });

    it('are none before any send', async () => {
        await expect(historyWorkspaceIds(root)).resolves.toEqual([]);
    });
});
