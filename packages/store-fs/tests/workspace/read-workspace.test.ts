import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createWorkspace, writeRepoTree, readWorkspace } from '../../src/index.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('reading one workspace', () => {
    it('returns the workspace that was written', async () => {
        await createWorkspace(root, {
            id: 'eventos-de-pagos',
            name: 'Eventos de pagos',
            kind: 'async',
        });

        const read = await readWorkspace(root, 'eventos-de-pagos');

        expect(read.ok && read.value.name).toBe('Eventos de pagos');
    });

    it('reports a workspace that is not there as a warning', async () => {
        const read = await readWorkspace(root, 'no-existe');

        expect(read.ok).toBe(false);
    });
});
