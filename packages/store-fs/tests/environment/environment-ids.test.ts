import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environmentIds } from '../../src/environment/environment-ids.js';
import { environmentsDir } from '../../src/environment/environment-path.js';
import { createWorkspace, writeRepoTree } from '../../src/index.js';

let root: string;

const WORKSPACE = 'eventos-de-pagos';

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-environment-ids-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, { id: WORKSPACE, name: 'Eventos de pagos', kind: 'async' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('the ids an environments folder already holds', () => {
    it('answers none before the folder exists', async () => {
        expect(await environmentIds(root, WORKSPACE)).toEqual([]);
    });

    it('reads the ids from the file names, sorted', async () => {
        const directory = environmentsDir(root, WORKSPACE);

        await mkdir(directory, { recursive: true });
        await writeFile(join(directory, 'prod.yaml'), 'name: Prod\n', 'utf8');
        await writeFile(join(directory, 'local.yaml'), 'name: Local\n', 'utf8');

        expect(await environmentIds(root, WORKSPACE)).toEqual(['local', 'prod']);
    });

    /** The name is the id: a file the parser would reject still holds its name. */
    it('counts a file with unreadable content, and skips what is not a yaml id', async () => {
        const directory = environmentsDir(root, WORKSPACE);

        await mkdir(directory, { recursive: true });
        await writeFile(join(directory, 'roto.yaml'), 'name: [\n', 'utf8');
        await writeFile(join(directory, 'notas.txt'), 'hola', 'utf8');
        await writeFile(join(directory, 'Mala Id.yaml'), 'name: X\n', 'utf8');

        expect(await environmentIds(root, WORKSPACE)).toEqual(['roto']);
    });
});
