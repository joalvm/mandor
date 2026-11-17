import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    bareTree,
    diskTree,
    docTitled,
    entityNamed,
    filesIn,
    holderNamed,
    itemNamed,
    onDisk,
    workspaceNamed,
    workspaces,
} from '../../workspace/disk-by-name.mjs';

const run = promisify(execFile);

/** A repo as the app lays it out: ids on disk, names inside the files. */
const FILES = {
    'workspaces/w1/workspace.yaml': 'name: Personal\n',
    'workspaces/w2/workspace.yaml': 'name: Otro\n',
    'workspaces/w1/environments/e1.yaml': 'name: Local\n',
    'workspaces/w1/connections/c1.yaml': 'name: Echo\nurl: ws://x\n',
    'workspaces/w1/collections/collections.yaml': 'order: []\n',
    'workspaces/w1/collections/k1/collection.yaml': 'name: Events\n',
    'workspaces/w1/collections/k1/i1.yaml': 'name: Pedido creado\n',
    'workspaces/w1/collections/k1/f1/folder.yaml': 'name: Admin\n',
    'workspaces/w1/collections/k1/f1/i2.yaml': 'name: Borrar pedido\n',
    'workspaces/w1/docs/d1.md': '---\ntitle: Notas\n---\n# Cuerpo\n',
    'workspaces/w1/docs/leeme.md': '# Sin front matter\n',
};

let root = '';

async function lay(files, base = root) {
    for (const [path, text] of Object.entries(files)) {
        await mkdir(dirname(join(base, path)), { recursive: true });
        await writeFile(join(base, path), text, 'utf8');
    }
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'disk-by-name-'));
});

afterEach(async () => {
    await rm(root, { force: true, maxRetries: 10, recursive: true });
});

describe('the disk of a repo read by visible name (diskTree)', () => {
    it('lists every file under the workspaces, sorted, with / and no root', async () => {
        await lay(FILES);

        expect(await diskTree(root).list()).toEqual(Object.keys(FILES).sort());
    });

    it('lists nothing when the repo has no workspaces yet', async () => {
        expect(await diskTree(root).list()).toEqual([]);
    });

    it('reads a file by the path the listing gave', async () => {
        await lay(FILES);

        expect(await diskTree(root).read('workspaces/w2/workspace.yaml')).toBe('name: Otro\n');
    });

    it('names the workspaces by their name and not by their directory', async () => {
        await lay(FILES);
        const tree = diskTree(root);

        expect(await workspaces(tree)).toEqual([
            { dir: 'workspaces/w1', name: 'Personal' },
            { dir: 'workspaces/w2', name: 'Otro' },
        ]);
        expect(await workspaceNamed(tree, 'Otro')).toBe('workspaces/w2');
        expect(await workspaceNamed(tree, 'Nadie')).toBeNull();
    });

    it('finds an entity of a workspace among the files that sit directly in a directory', async () => {
        await lay(FILES);
        const tree = diskTree(root);

        expect(await entityNamed(tree, 'workspaces/w1/environments', 'Local')).toBe(
            'workspaces/w1/environments/e1.yaml',
        );
        expect(await entityNamed(tree, 'workspaces/w1/connections', 'Echo')).toBe(
            'workspaces/w1/connections/c1.yaml',
        );
        expect(await entityNamed(tree, 'workspaces/w1/connections', 'Local')).toBeNull();
        expect(await filesIn(tree, 'workspaces/w1/connections')).toEqual([
            'workspaces/w1/connections/c1.yaml',
        ]);
    });

    it('goes down collection and folders by name, and finds the item by its own', async () => {
        await lay(FILES);
        const tree = diskTree(root);
        const collections = 'workspaces/w1/collections';

        expect(await holderNamed(tree, collections, ['Events'])).toBe(`${collections}/k1`);
        expect(await holderNamed(tree, collections, ['Events', 'Admin'])).toBe(
            `${collections}/k1/f1`,
        );
        expect(await holderNamed(tree, collections, ['Events', 'Nadie'])).toBeNull();
        expect(await itemNamed(tree, collections, ['Events', 'Pedido creado'])).toBe(
            `${collections}/k1/i1.yaml`,
        );
        expect(await itemNamed(tree, collections, ['Events', 'Admin', 'Borrar pedido'])).toBe(
            `${collections}/k1/f1/i2.yaml`,
        );
    });

    it('does not take the definition of a group for one of its items', async () => {
        await lay(FILES);
        const tree = diskTree(root);

        expect(await itemNamed(tree, 'workspaces/w1/collections', ['Events', 'Events'])).toBeNull();
        expect(await itemNamed(tree, 'workspaces/w1/collections', ['Events', 'Admin'])).toBeNull();
    });

    it('finds a doc by its front matter title, or by its file name when it has none', async () => {
        await lay(FILES);
        const tree = diskTree(root);
        const docs = 'workspaces/w1/docs';

        expect(await docTitled(tree, docs, 'Notas')).toBe(`${docs}/d1.md`);
        expect(await docTitled(tree, docs, 'leeme')).toBe(`${docs}/leeme.md`);
        expect(await docTitled(tree, docs, 'd1')).toBeNull();
    });

    it('does not match a file that cannot be read, and does not throw on it', async () => {
        await lay({
            ...FILES,
            'workspaces/w3/workspace.yaml': 'name: [unclosed\n  : : :\n',
            'workspaces/w1/environments/e2.yaml': '{ not yaml',
        });
        const tree = diskTree(root);

        expect(await workspaceNamed(tree, 'unclosed')).toBeNull();
        expect(await entityNamed(tree, 'workspaces/w1/environments', 'Local')).toBe(
            'workspaces/w1/environments/e1.yaml',
        );
    });

    it('hands back what it found and fails naming what was not there', () => {
        expect(onDisk('workspaces/w1', 'the workspace')).toBe('workspaces/w1');
        expect(() => onDisk(null, 'the workspace')).toThrow('the workspace is not on disk');
    });

    it('answers with the first of two that go by the same name, in path order', async () => {
        await lay({
            'workspaces/b/workspace.yaml': 'name: Igual\n',
            'workspaces/a/workspace.yaml': 'name: Igual\n',
        });

        expect(await workspaceNamed(diskTree(root), 'Igual')).toBe('workspaces/a');
    });
});

describe('the tip of a shared repo read by visible name (bareTree)', () => {
    async function sharedRepo() {
        const bare = join(root, 'shared.git');
        const clone = join(root, 'clone');
        const git = (cwd, ...args) =>
            run(
                'git',
                [
                    '-c',
                    'user.name=t',
                    '-c',
                    'user.email=t@t',
                    '-c',
                    'commit.gpgsign=false',
                    ...args,
                ],
                { cwd },
            );

        await run('git', ['init', '--bare', '--initial-branch=main', bare]);
        await run('git', ['clone', bare, clone]);
        await lay(FILES, clone);
        await git(clone, 'add', '-A');
        await git(clone, 'commit', '-m', 'seed');
        await git(clone, 'push', 'origin', 'HEAD:main');

        return bare;
    }

    it('lists and reads the files of the branch as the repo has them', async () => {
        const tree = bareTree(await sharedRepo());

        expect(await tree.list()).toEqual(Object.keys(FILES).sort());
        expect(await tree.read('workspaces/w1/workspace.yaml')).toBe('name: Personal\n');
    });

    it('finds by name what the disk finds by name', async () => {
        const tree = bareTree(await sharedRepo());

        expect(await workspaceNamed(tree, 'Personal')).toBe('workspaces/w1');
        expect(
            await itemNamed(tree, 'workspaces/w1/collections', ['Events', 'Pedido creado']),
        ).toBe('workspaces/w1/collections/k1/i1.yaml');
        expect(await docTitled(tree, 'workspaces/w1/docs', 'Notas')).toBe(
            'workspaces/w1/docs/d1.md',
        );
    });

    it('lists nothing while the branch does not exist yet', async () => {
        const bare = join(root, 'empty.git');

        await run('git', ['init', '--bare', '--initial-branch=main', bare]);

        expect(await bareTree(bare).list()).toEqual([]);
        expect(await workspaceNamed(bareTree(bare), 'Personal')).toBeNull();
    });
});
