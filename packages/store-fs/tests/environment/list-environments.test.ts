import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    createWorkspace,
    writeRepoTree,
    listEnvironments,
    writeEnvironment,
} from '../../src/index.js';
import { environmentsDir } from '../../src/environment/environment-path.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, {
        id: 'eventos-de-pagos',
        name: 'Eventos de pagos',
        kind: 'async',
    });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

function environment(id: string, name: string) {
    return { id, name, variables: [] };
}

describe('listing environments', () => {
    it('returns them sorted by name, whatever their ids', async () => {
        await writeEnvironment(root, 'eventos-de-pagos', environment('aaa', 'Zeta'));
        await writeEnvironment(root, 'eventos-de-pagos', environment('zzz', 'Alfa'));

        const listed = await listEnvironments(root, 'eventos-de-pagos');

        expect(listed.environments.map((entry) => entry.name)).toEqual(['Alfa', 'Zeta']);
    });

    it('returns nothing when the workspace has no environments yet', async () => {
        const listed = await listEnvironments(root, 'eventos-de-pagos');

        expect(listed).toEqual({ environments: [], warnings: [] });
    });

    it('ignores files that are not YAML documents of an environment', async () => {
        await mkdir(environmentsDir(root, 'eventos-de-pagos'), { recursive: true });
        await writeFile(
            join(environmentsDir(root, 'eventos-de-pagos'), 'notas.md'),
            '# nada\n',
            'utf8',
        );
        await writeEnvironment(root, 'eventos-de-pagos', environment('alfa', 'Alfa'));

        const listed = await listEnvironments(root, 'eventos-de-pagos');

        expect(listed.environments.map((entry) => entry.id)).toEqual(['alfa']);
        expect(listed.warnings).toEqual([]);
    });

    it('turns a broken environment file into a warning', async () => {
        await mkdir(environmentsDir(root, 'eventos-de-pagos'), { recursive: true });
        await writeFile(
            join(environmentsDir(root, 'eventos-de-pagos'), 'roto.yaml'),
            'id: [roto\n',
            'utf8',
        );

        const listed = await listEnvironments(root, 'eventos-de-pagos');

        expect(listed.environments).toEqual([]);
        expect(listed.warnings).toHaveLength(1);
    });
});
