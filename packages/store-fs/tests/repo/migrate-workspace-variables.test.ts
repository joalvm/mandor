import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    createEnvironment,
    effectiveEnvironment,
    parseRepo,
    parseWorkspace,
    REPO_FORMAT,
} from '@mandor/schema';
import { parse } from 'yaml';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { needsFormatMigration, migrateRepoFormat } from '../../src/repo/migrate-repo-format.js';
import {
    createWorkspace,
    listEnvironments,
    readWorkspace,
    writeEnvironment,
    writeRepoTree,
} from '../../src/index.js';

const WS = 'pagos';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-migrate-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, { id: WS, name: 'Pagos', kind: 'sync' });
    await writeFile(
        join(root, 'mandor.yaml'),
        'formatVersion: 1\nname: Mi repo\nworkspaces:\n  - pagos\n',
        'utf8',
    );
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

function plain(name: string, value: string, enabled = true) {
    return { name, value, enabled, secret: false };
}

async function withWorkspaceVariables(text: string): Promise<void> {
    const file = join(root, 'workspaces', WS, 'workspace.yaml');
    const before = await readFile(file, 'utf8');

    await writeFile(file, `${before}variables:\n${text}`, 'utf8');
}

/** What a name resolves to in the environment a machine ends up with, chosen or by default. */
async function resolvedIn(chosen: string | null, name: string): Promise<string | undefined> {
    const read = await readWorkspace(root, WS);
    const workspace = read.ok ? read.value : null;
    const id = effectiveEnvironment(chosen, workspace);
    const { environments } = await listEnvironments(root, WS);
    const environment = environments.find((each) => each.id === id);

    return environment?.variables.find((each) => each.name === name && each.enabled)?.value;
}

describe('migrateWorkspaceVariables, through the migration of the origin', () => {
    beforeEach(async () => {
        await withWorkspaceVariables(
            '  - name: host\n    value: ws.local\n    enabled: true\n    secret: false\n' +
                '  - name: page\n    value: "1"\n    enabled: true\n    secret: false\n',
        );
        await writeEnvironment(
            root,
            WS,
            createEnvironment({
                id: 'prod',
                name: 'Prod',
                variables: [plain('host', 'prod.example')],
            }),
        );
        await writeEnvironment(
            root,
            WS,
            createEnvironment({
                id: 'dev',
                name: 'Dev',
                variables: [{ name: 'page', value: '', enabled: false, secret: true }],
            }),
        );
    });

    it('leaves every value a machine resolved as it was, chosen or not', async () => {
        const before = {
            prod: { host: 'prod.example', page: '1' },
            dev: { host: 'ws.local', page: '1' },
        };

        expect(await needsFormatMigration(root)).toBe(true);

        await migrateRepoFormat(root);

        for (const [id, values] of Object.entries(before)) {
            expect(await resolvedIn(id, 'host')).toBe(values.host);
            expect(await resolvedIn(id, 'page')).toBe(values.page);
        }

        // A machine with no selection resolved the workspace alone: Base is its default now.
        expect(await resolvedIn(null, 'host')).toBe('ws.local');
        expect(await resolvedIn(null, 'page')).toBe('1');
    });

    it('takes the key out of workspace.yaml and seals the format', async () => {
        const touched = await migrateRepoFormat(root);
        const workspace: unknown = parse(
            await readFile(join(root, 'workspaces', WS, 'workspace.yaml'), 'utf8'),
        );
        const repo = parseRepo(parse(await readFile(join(root, 'mandor.yaml'), 'utf8')));

        expect(workspace).not.toHaveProperty('variables');
        expect(parseWorkspace(workspace).defaultEnvironment).toBeDefined();
        expect(repo.formatVersion).toBe(REPO_FORMAT);
        expect(touched).toContain(join(root, 'mandor.yaml'));
        expect(touched).toContain(join(root, 'workspaces', WS, 'workspace.yaml'));
    });

    it('touches nothing the second time', async () => {
        await migrateRepoFormat(root);

        expect(await needsFormatMigration(root)).toBe(false);
        expect(await migrateRepoFormat(root)).toEqual([]);
    });

    it('names Base apart when an environment is already called that', async () => {
        await writeEnvironment(
            root,
            WS,
            createEnvironment({ id: 'base', name: 'Base', variables: [] }),
        );
        await migrateRepoFormat(root);

        const { environments } = await listEnvironments(root, WS);

        expect(environments.map((each) => each.name).sort()).toEqual([
            'Base',
            'Base 2',
            'Dev',
            'Prod',
        ]);
    });
});

describe('an origin already in shape', () => {
    it('only seals the format of a repo written before it', async () => {
        expect(await needsFormatMigration(root)).toBe(true);
        expect(await migrateRepoFormat(root)).toEqual([join(root, 'mandor.yaml')]);
        expect(await needsFormatMigration(root)).toBe(false);
    });
});

describe('the edges of a migration', () => {
    it('takes an empty list out and makes no Base', async () => {
        await writeFile(
            join(root, 'workspaces', WS, 'workspace.yaml'),
            'id: pagos\nname: Pagos\nkind: sync\nvariables: []\n',
            'utf8',
        );

        await migrateRepoFormat(root);

        const text = await readFile(join(root, 'workspaces', WS, 'workspace.yaml'), 'utf8');

        expect(text).not.toContain('variables');
        expect(text).not.toContain('defaultEnvironment');
        expect((await listEnvironments(root, WS)).environments).toEqual([]);
    });

    it('keeps the default a workspace already had', async () => {
        await writeFile(
            join(root, 'workspaces', WS, 'workspace.yaml'),
            'id: pagos\nname: Pagos\nkind: sync\ndefaultEnvironment: prod\nvariables:\n' +
                '  - name: host\n    value: ws.local\n    enabled: true\n    secret: false\n',
            'utf8',
        );

        await migrateRepoFormat(root);

        const read = await readWorkspace(root, WS);

        expect(read.ok && read.value.defaultEnvironment).toBe('prod');
    });

    it('leaves alone a workspace file it cannot read', async () => {
        await writeFile(join(root, 'workspaces', WS, 'workspace.yaml'), 'name: [\n', 'utf8');

        expect(await needsFormatMigration(root)).toBe(true);
        expect(await migrateRepoFormat(root)).toEqual([join(root, 'mandor.yaml')]);
        expect(await readFile(join(root, 'workspaces', WS, 'workspace.yaml'), 'utf8')).toBe(
            'name: [\n',
        );
        expect(await needsFormatMigration(root)).toBe(false);
    });
});
