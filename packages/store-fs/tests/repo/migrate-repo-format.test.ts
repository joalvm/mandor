import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { REPO_FORMAT } from '@mandor/schema';
import { parse } from 'yaml';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createWorkspace, writeRepoTree } from '../../src/index.js';
import { migrateRepoFormat, needsFormatMigration } from '../../src/repo/migrate-repo-format.js';

const WS = 'shop';

/** An origin of format 2, as an import of Postman left it, on a real disk. */
let origin: string;

let touched: string[];

function at(...segments: string[]): string {
    return join(origin, 'workspaces', WS, ...segments);
}

function inCollections(...segments: string[]): string {
    return at('collections', ...segments);
}

async function put(file: string, text: string): Promise<void> {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, text, 'utf8');
}

function imported(event: string, source: string): string {
    return `importedScripts:\n  - event: ${event}\n    dialect: postman\n    source: ${source}\n`;
}

/** The own script of a moment as the file keeps it after the migration. */
async function scriptOf(file: string, event: string): Promise<unknown> {
    const value = parse(await readFile(file, 'utf8')) as Record<string, unknown>;

    expect(value).not.toHaveProperty('importedScripts');

    return (value['scripts'] as Record<string, unknown> | undefined)?.[event];
}

beforeAll(async () => {
    origin = await mkdtemp(join(tmpdir(), 'mandor-fold-'));

    await writeRepoTree(origin, 'Tienda');
    await createWorkspace(origin, { id: WS, name: 'Tienda', kind: 'sync' });
    await put(
        join(origin, 'mandor.yaml'),
        'formatVersion: 2\nname: Tienda\nworkspaces:\n  - shop\n',
    );

    const workspace = await readFile(at('workspace.yaml'), 'utf8');

    await put(
        at('workspace.yaml'),
        `# del equipo\n${workspace}${imported('onBeforeRequest', 'shared()')}`,
    );
    await put(
        inCollections('api', 'collection.yaml'),
        `name: API\nscripts:\n  onBeforeRequest:\n    source: own()\n${imported('onBeforeRequest', 'imp()')}`,
    );
    await put(inCollections('admin', 'collection.yaml'), 'name: Admin\n');
    await put(
        inCollections('api', 'users', 'folder.yaml'),
        `name: Users\n${imported('onResponse', 'folder()')}`,
    );
    await put(
        inCollections('api', 'users', 'list.yaml'),
        '# a mano\nname: List\nmethod: GET\nurl: https://shop.test/users\n' +
            'scripts:\n  onResponse:\n    source: mine()\n    enabled: false\n' +
            imported('onResponse', 'theirs()'),
    );
    await put(inCollections('api', 'users', 'plain.yaml'), 'name: Plain\nmethod: GET\nurl: x\n');

    expect(await needsFormatMigration(origin)).toBe(true);

    touched = await migrateRepoFormat(origin);
});

afterAll(async () => {
    await rm(origin, { recursive: true, force: true });
});

describe('migrateRepoFormat over an origin of format 2', () => {
    it('puts what an import left after the own script of its moment, keeping it off', async () => {
        expect(await scriptOf(inCollections('api', 'users', 'list.yaml'), 'onResponse')).toEqual({
            source: 'mine()\n\ntheirs()',
            enabled: false,
        });
    });

    it('gives a folder the script it only had as imported', async () => {
        expect(await scriptOf(inCollections('api', 'users', 'folder.yaml'), 'onResponse')).toEqual({
            source: 'folder()',
        });
    });

    it('puts the script of the workspace first in the root of every collection', async () => {
        expect(await scriptOf(inCollections('api', 'collection.yaml'), 'onBeforeRequest')).toEqual({
            source: 'shared()\n\nown()\n\nimp()',
        });
        expect(
            await scriptOf(inCollections('admin', 'collection.yaml'), 'onBeforeRequest'),
        ).toEqual({ source: 'shared()' });
    });

    it('takes the key out of the workspace and keeps the comments of every file', async () => {
        const workspace = await readFile(at('workspace.yaml'), 'utf8');

        expect(workspace).not.toContain('importedScripts');
        expect(workspace.startsWith('# del equipo')).toBe(true);
        expect(
            (await readFile(inCollections('api', 'users', 'list.yaml'), 'utf8')).startsWith(
                '# a mano',
            ),
        ).toBe(true);
    });

    it('seals format 3 and leaves a file with no scripts as it was', async () => {
        const repo = parse(await readFile(join(origin, 'mandor.yaml'), 'utf8')) as unknown;

        expect(REPO_FORMAT).toBe(3);
        expect(repo).toMatchObject({ formatVersion: REPO_FORMAT });
        expect(await readFile(inCollections('api', 'users', 'plain.yaml'), 'utf8')).toBe(
            'name: Plain\nmethod: GET\nurl: x\n',
        );
        expect(touched).not.toContain(inCollections('api', 'users', 'plain.yaml'));
        expect([...touched].sort()).toEqual(
            [
                at('workspace.yaml'),
                inCollections('api', 'collection.yaml'),
                inCollections('admin', 'collection.yaml'),
                inCollections('api', 'users', 'folder.yaml'),
                inCollections('api', 'users', 'list.yaml'),
                join(origin, 'mandor.yaml'),
            ].sort(),
        );
    });

    it('asks for nothing and touches nothing the second time', async () => {
        expect(await needsFormatMigration(origin)).toBe(false);
        expect(await migrateRepoFormat(origin)).toEqual([]);
    });
});

describe('migrateRepoFormat over a workspace that shares nothing to fold', () => {
    let quiet: string;
    let done: string[];

    beforeAll(async () => {
        quiet = await mkdtemp(join(tmpdir(), 'mandor-fold-quiet-'));

        await writeRepoTree(quiet, 'Quieto');
        await createWorkspace(quiet, { id: WS, name: 'Quieto', kind: 'sync' });
        await put(
            join(quiet, 'mandor.yaml'),
            'formatVersion: 2\nname: Quieto\nworkspaces:\n  - shop\n',
        );

        const workspace = join(quiet, 'workspaces', WS, 'workspace.yaml');

        await put(workspace, `${await readFile(workspace, 'utf8')}importedScripts: []\n`);
        await put(
            join(quiet, 'workspaces', WS, 'collections', 'api', 'collection.yaml'),
            'name: API\n',
        );
        await put(
            join(quiet, 'workspaces', WS, 'collections', 'api', 'users', 'folder.yaml'),
            'name: Users\nimportedScripts: []\n',
        );

        done = await migrateRepoFormat(quiet);
    });

    afterAll(async () => {
        await rm(quiet, { recursive: true, force: true });
    });

    it('leaves a collection the empty list changes nothing in as it was', async () => {
        const collection = join(quiet, 'workspaces', WS, 'collections', 'api', 'collection.yaml');

        expect(done).not.toContain(collection);
        expect(done).toContain(join(quiet, 'workspaces', WS, 'workspace.yaml'));
        expect(await readFile(collection, 'utf8')).toBe('name: API\n');
    });

    it('takes an empty list out of a file and gives it no scripts in its place', async () => {
        const folder = join(quiet, 'workspaces', WS, 'collections', 'api', 'users', 'folder.yaml');

        expect(done).toContain(folder);
        expect(await readFile(folder, 'utf8')).toBe('name: Users\n');
    });
});
