import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createWorkspace, writeConflict, writeRepoTree } from '@mandor/store-fs';
import { describe, expect, it } from 'vitest';

import { migrateOrigin } from '../../src/repo/migrate-origin.js';
import { tempRepo } from './support/temp-repo.js';

const repo = tempRepo();

/** An origin an older build saved: format 1, and variables in its workspace. */
async function oldOrigin(): Promise<void> {
    const root = repo.root();

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'pagos', name: 'Pagos', kind: 'sync' });
    await writeFile(
        join(root, 'mandor.yaml'),
        'formatVersion: 1\nname: Demo\nworkspaces:\n  - pagos\n',
        'utf8',
    );

    const file = join(root, 'workspaces', 'pagos', 'workspace.yaml');

    await writeFile(
        file,
        `${await readFile(file, 'utf8')}variables:\n  - name: host\n    value: ws.local\n    enabled: true\n    secret: false\n`,
        'utf8',
    );
}

describe('migrateOrigin', () => {
    it('migrates an old origin in a commit of its own and answers the files it changed', async () => {
        await oldOrigin();

        const files = await migrateOrigin(repo.root());

        expect(files).toContain('mandor.yaml');
        expect(files).toContain('workspaces/pagos/workspace.yaml');
        expect((await repo.subjects())[0]).toBe('migrate repo format');
        expect(await readFile(join(repo.root(), 'mandor.yaml'), 'utf8')).toContain(
            'formatVersion: 3',
        );
    });

    it('does nothing the second time', async () => {
        await oldOrigin();
        await migrateOrigin(repo.root());

        const before = await repo.subjects();

        expect(await migrateOrigin(repo.root())).toEqual([]);
        expect(await repo.subjects()).toEqual(before);
    });

    it('waits while a clash waits for a person', async () => {
        await oldOrigin();
        await writeConflict(repo.root(), {
            path: 'workspaces/pagos/workspace.yaml',
            source: 'merge',
            base: null,
            theirs: 'name: Pagos\n',
            at: '2026-11-04T00:00:00.000Z',
        });

        expect(await migrateOrigin(repo.root())).toEqual([]);
        expect(await readFile(join(repo.root(), 'mandor.yaml'), 'utf8')).toContain(
            'formatVersion: 1',
        );
    });

    it('leaves an origin it cannot read for the load to report', async () => {
        await writeFile(join(repo.root(), 'mandor.yaml'), 'formatVersion: [\n', 'utf8');

        expect(await migrateOrigin(repo.root())).toEqual([]);
    });
});
