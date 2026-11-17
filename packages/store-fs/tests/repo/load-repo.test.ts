import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadRepo } from '../../src/index.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

async function write(relative: string, source: string): Promise<void> {
    const path = join(root, relative);

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, source, 'utf8');
}

async function writeRepo(...ids: string[]): Promise<void> {
    const order = ids.map((id) => `    - ${id}`).join('\n');

    await write('mandor.yaml', `formatVersion: 1\nname: Mi repo\nworkspaces:\n${order}\n`);
}

async function writeWorkspace(id: string, extra = ''): Promise<void> {
    await write(`workspaces/${id}/workspace.yaml`, `id: ${id}\nkind: async\nname: ${id}\n${extra}`);
}

describe('loading a repo', () => {
    it('returns the workspaces in the order stored in the repo file', async () => {
        await writeRepo('eventos-pagos', 'api-pagos');
        await writeWorkspace('api-pagos');
        await writeWorkspace('eventos-pagos');

        const loaded = await loadRepo(root);

        expect(loaded.repo?.name).toBe('Mi repo');
        expect(loaded.workspaces.map((workspace) => workspace.id)).toEqual([
            'eventos-pagos',
            'api-pagos',
        ]);
        expect(loaded.warnings).toEqual([]);
    });

    /** A key written by the other app is not an error here; it is data this app must not touch. */
    it('loads a workspace carrying an unknown key without a warning', async () => {
        await writeRepo('api-pagos');
        await writeWorkspace('api-pagos', 'color: teal\n');

        const loaded = await loadRepo(root);

        expect(loaded.warnings).toEqual([]);
        expect(loaded.workspaces.map((workspace) => workspace.id)).toEqual(['api-pagos']);
    });

    /** One corrupt file costs the user that workspace, never the whole repo. */
    it('turns a broken workspace file into a warning and loads the rest', async () => {
        await writeRepo('roto', 'api-pagos');
        await write('workspaces/roto/workspace.yaml', 'id: [roto\n');
        await writeWorkspace('api-pagos');

        const loaded = await loadRepo(root);

        expect(loaded.workspaces.map((workspace) => workspace.id)).toEqual(['api-pagos']);
        expect(loaded.warnings).toHaveLength(1);
        expect(loaded.warnings[0]?.path).toBe(join(root, 'workspaces', 'roto', 'workspace.yaml'));
    });

    it('reports a missing workspace file as a warning', async () => {
        await writeRepo('api-pagos');

        const loaded = await loadRepo(root);

        expect(loaded.workspaces).toEqual([]);
        expect(loaded.warnings).toHaveLength(1);
    });

    it('returns no repo when the repo file is missing', async () => {
        const loaded = await loadRepo(root);

        expect(loaded.repo).toBeNull();
        expect(loaded.workspaces).toEqual([]);
        expect(loaded.warnings[0]?.path).toBe(join(root, 'mandor.yaml'));
    });

    it('returns no repo when the repo file fails the schema', async () => {
        await write('mandor.yaml', 'formatVersion: 1\nname: "  "\nworkspaces: []\n');

        const loaded = await loadRepo(root);

        expect(loaded.repo).toBeNull();
        expect(loaded.warnings).toHaveLength(1);
    });

    it('says a newer build saved the repo when its format is past the one this build reads', async () => {
        await write('mandor.yaml', 'formatVersion: 99\nname: Personal\nworkspaces: []\n');

        const loaded = await loadRepo(root);

        expect(loaded.repo).toBeNull();
        expect(loaded.warnings).toEqual([
            { path: join(root, 'mandor.yaml'), message: 'saved by a newer version of Mandor' },
        ]);
    });
});
