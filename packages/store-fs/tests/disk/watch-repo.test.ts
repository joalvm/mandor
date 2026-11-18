import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, posix, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type DiskChange, writeRepoTree, type RepoWatcher, watchRepo } from '../../src/index.js';

/** The window of the watcher under test. Nothing here asserts on how long it lasts. */
const WINDOW = 150;

/** Room for a loaded machine to deliver an event. A wait ends the moment the event lands. */
const ARRIVAL = { interval: 20, timeout: 5000 };

let root: string;
let batches: DiskChange[][];
let watcher: RepoWatcher;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
    batches = [];

    await writeRepoTree(root, 'Mi repo');

    watcher = watchRepo(root, (changes) => batches.push(changes), WINDOW);
});

afterEach(async () => {
    watcher.dispose();
    await rm(root, { recursive: true, force: true });
});

/** Waits well past the window, so a batch that was going to be emitted already was. */
function settle(): Promise<void> {
    return delay(WINDOW * 4);
}

/** What a write reads as once the batch is classified. */
function changed(path: string): DiskChange {
    return { kind: 'changed', path };
}

/** Writes `path` and waits until it is reported, so what the test does next is a batch apart. */
async function written(path: string, text: string): Promise<void> {
    await writeFile(join(root, path), text, 'utf8');
    await vi.waitFor(() => {
        expect(batches.flat()).toContainEqual(changed(path));
    }, ARRIVAL);
}

/** How many batches have named the workspaces directory itself. */
function workspacesReports(): number {
    return batches.filter((batch) =>
        batch.some((change) => 'path' in change && change.path === 'workspaces'),
    ).length;
}

/** Repo paths come back with `/` on every platform: that is how the repo, git and the entities spell them. */
describe('watching a repo', () => {
    it('reports a file written outside the app', async () => {
        const directory = join(root, 'workspaces', 'api-de-pagos');
        const path = posix.join('workspaces', 'api-de-pagos', 'workspace.yaml');

        await mkdir(directory, { recursive: true });
        await writeFile(join(root, path), 'id: api-de-pagos\n', 'utf8');

        await vi.waitFor(() => {
            expect(batches.flat()).toContainEqual(changed(path));
        }, ARRIVAL);
    });

    /**
     * How many batches a burst becomes is the rule of the window, and `batch-paths.test.ts`
     * proves it over a clock the test owns. Here the machine owns the clock, so what is
     * proved is the wiring: the whole burst reaches the listener, and not one call per file.
     */
    it('reports a burst of writes without firing once per file', async () => {
        const names = Array.from({ length: 10 }, (_value, index) => `w${String(index)}.yaml`);
        const paths = names.map((name) => posix.join('workspaces', name));

        for (const path of paths) {
            await writeFile(join(root, path), 'id: w\n', 'utf8');
        }

        await vi.waitFor(() => {
            expect(batches.flat()).toEqual(expect.arrayContaining(paths.map(changed)));
        }, ARRIVAL);

        expect(batches.length).toBeLessThan(names.length);
    });

    /** Renaming fires one event per name. Only the pair of them says what happened. */
    it('reports a rename as one move, with where it came from and where it went', async () => {
        const from = posix.join('workspaces', 'viejo.yaml');
        const to = posix.join('workspaces', 'nuevo.yaml');

        await written(from, 'id: viejo\n');
        await rename(join(root, from), join(root, to));

        await vi.waitFor(() => {
            expect(batches.flat()).toContainEqual({ kind: 'moved', from, to });
        }, ARRIVAL);
    });

    it('reports a file deleted outside the app as gone, not as a change', async () => {
        const path = posix.join('workspaces', 'borrado.yaml');

        await written(path, 'id: borrado\n');
        await rm(join(root, path));

        await vi.waitFor(() => {
            expect(batches.flat()).toContainEqual({ kind: 'removed', path });
        }, ARRIVAL);
    });

    it('says nothing about the private directory or about git', async () => {
        await writeFile(join(root, '.mandor', 'session.json'), '{}\n', 'utf8');
        await mkdir(join(root, '.git'), { recursive: true });
        await writeFile(join(root, '.git', 'HEAD'), 'ref: refs/heads/main\n', 'utf8');
        // A write it does report, after those: once it lands, anything earlier would have too.
        await writeFile(join(root, 'mandor.yaml'), 'name: Otro\n', 'utf8');

        await vi.waitFor(() => {
            expect(batches.flat()).toContainEqual(changed('mandor.yaml'));
        }, ARRIVAL);
        expect(batches.flat()).toEqual([changed('mandor.yaml')]);
    });

    it('stops reporting once disposed', async () => {
        watcher.dispose();

        await writeFile(join(root, 'mandor.yaml'), 'name: Otro\n', 'utf8');
        await settle();

        expect(batches).toEqual([]);
    });

    /** A batch still forming when the app closes must not fire against a dead listener. */
    it('drops a batch that was still forming when it was disposed', async () => {
        await writeFile(join(root, 'mandor.yaml'), 'name: Otro\n', 'utf8');

        watcher.dispose();
        await settle();

        expect(batches).toEqual([]);
    });

    /**
     * Windows answers the removal of the watched directory with an endless run of events that
     * name the directory itself, by its absolute path. Followed, they keep the process busy and
     * report a path that belongs to no repo.
     */
    it('stops, and reports nothing outside the repo, once the repo itself is removed', async () => {
        await rm(root, { recursive: true, force: true });
        await settle();

        const reported = batches.length;

        await settle();

        expect(batches).toHaveLength(reported);
        expect(JSON.stringify(batches)).not.toContain(basename(root));
    });

    /** A pull or a restore can take the directory away and bring it back: the watch follows it. */
    it('keeps reporting the workspaces once their directory is gone and back', async () => {
        // The directory comes back only once its going was heard: the watch then follows it
        // while it is missing too, whatever the order the events of a fast machine land in.
        await rm(join(root, 'workspaces'), { recursive: true, force: true });
        await vi.waitFor(() => {
            expect(workspacesReports()).toBeGreaterThan(0);
        }, ARRIVAL);
        await settle();

        const gone = workspacesReports();

        await mkdir(join(root, 'workspaces'));
        await vi.waitFor(() => {
            expect(workspacesReports()).toBeGreaterThan(gone);
        }, ARRIVAL);
        await settle();

        await written(posix.join('workspaces', 'vuelto.yaml'), 'id: vuelto\n');
    });

    /** Windows reports events against the real path; a watcher on another spelling aborts. */
    it('watches a root given in a non-canonical spelling', async () => {
        watcher.dispose();
        watcher = watchRepo(`${root}${sep}.`, (changes) => batches.push(changes), WINDOW);

        await writeFile(join(root, 'mandor.yaml'), 'name: Otro\n', 'utf8');

        await vi.waitFor(() => {
            expect(batches.flat()).toContainEqual(changed('mandor.yaml'));
        }, ARRIVAL);
    });
});
