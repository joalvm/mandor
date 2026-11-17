import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    createWorkspace,
    FileReadError,
    writeRepoTree,
    readEnvironment,
    writeEnvironment,
} from '../../src/index.js';

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

describe('reading an environment', () => {
    it('returns the environment stored in its file', async () => {
        const local = {
            id: 'local',
            name: 'Local',
            variables: [{ name: 'host', value: 'localhost:8080', enabled: true, secret: false }],
        };

        await writeEnvironment(root, 'eventos-de-pagos', local);

        expect(await readEnvironment(root, 'eventos-de-pagos', 'local')).toEqual(local);
    });

    it('reports an environment that is not there', async () => {
        await expect(readEnvironment(root, 'eventos-de-pagos', 'no-existe')).rejects.toThrow(
            FileReadError,
        );
    });
});
