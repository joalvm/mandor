import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { listConflicts } from '@mandor/store-fs';
import { describe, expect, it } from 'vitest';

import { onConflictRecorded } from '../../src/repo/conflict-events.js';
import { flushCommits } from '../../src/repo/commit-scheduler.js';
import { guardedWrite } from '../../src/repo/guarded-write.js';
import { knownText, rememberText } from '../../src/repo/known-texts.js';
import { tempRepo } from './support/temp-repo.js';

const repo = tempRepo();

const PATH = 'a.yaml';
const BASE = 'name: A\ncolor: rojo\n';
const AZUL = 'name: B\ncolor: azul\n';

function disk(): Promise<string> {
    return readFile(join(repo.root(), PATH), 'utf8');
}

/** The edit of the window: it changed `name` and nothing else. */
function renamed(to: string) {
    return {
        root: repo.root(),
        path: PATH,
        change: { kind: 'update-item', name: 'a' },
        oursFrom: (base: string | null) => (base ?? '').replace('name: A', `name: ${to}`),
        write: async () => {
            await repo.write(PATH, BASE.replace('name: A', `name: ${to}`));
        },
    } as const;
}

describe('writing an entity the window may have read long ago', () => {
    it('writes as always when the window never read the file', async () => {
        await guardedWrite(renamed('B'));

        expect(await disk()).toBe('name: B\ncolor: rojo\n');
        expect(knownText(repo.root(), PATH)).toBe('name: B\ncolor: rojo\n');
    });

    it('writes as always when the file is what the window read', async () => {
        await repo.write(PATH, BASE);
        rememberText(repo.root(), PATH, BASE);

        await guardedWrite(renamed('B'));

        expect(await disk()).toBe('name: B\ncolor: rojo\n');
        expect((await listConflicts(repo.root())).conflicts).toEqual([]);
    });

    /** The colleague's change must survive the save of a tab that never saw it. */
    it('merges when the file changed on disk after the window read it', async () => {
        await repo.write(PATH, 'name: A\ncolor: azul\n');
        rememberText(repo.root(), PATH, BASE);

        await guardedWrite(renamed('B'));

        expect(await disk()).toBe('name: B\ncolor: azul\n');
        expect((await listConflicts(repo.root())).conflicts).toEqual([]);
        expect(knownText(repo.root(), PATH)).toBe('name: B\ncolor: rojo\n');
    });

    it('keeps the window version and records the clash when both touched the same field', async () => {
        const heard: string[] = [];
        const stop = onConflictRecorded((_root, path) => heard.push(path));

        await repo.write(PATH, 'name: Z\ncolor: rojo\n');
        rememberText(repo.root(), PATH, BASE);

        await guardedWrite(renamed('B'));
        stop();

        const { conflicts } = await listConflicts(repo.root());

        expect(await disk()).toBe('name: B\ncolor: rojo\n');
        expect(conflicts).toHaveLength(1);
        expect(conflicts[0]?.record).toMatchObject({
            path: PATH,
            source: 'write',
            base: BASE,
            theirs: 'name: Z\ncolor: rojo\n',
        });
        expect(heard).toEqual([PATH]);
    });

    it('commits the file like any other edit', async () => {
        await repo.write(PATH, 'name: A\ncolor: azul\n');
        rememberText(repo.root(), PATH, BASE);

        await guardedWrite(renamed('B'));
        await flushCommits(repo.root());

        expect(await repo.subjects()).toEqual(['update item a', 'init repo']);
    });

    it('does the work owed before writing on the plain path and on the merged one', async () => {
        const owed: string[] = [];
        const before = async () => {
            owed.push(await disk().catch(() => 'no file'));
        };

        await guardedWrite({ ...renamed('B'), beforeWrite: before });
        await repo.write(PATH, AZUL);
        await guardedWrite({ ...renamed('C'), beforeWrite: before });

        expect(owed).toEqual(['no file', AZUL]);
    });
});
