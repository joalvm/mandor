import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { FormatError } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    createWorkspace,
    FileReadError,
    writeRepoTree,
    readEnvironment,
    writeEnvironment,
} from '../../src/index.js';
import type { KeptSecret } from '../../src/environment/secret-keeper.js';

let root: string;
let path: string;

const local = {
    id: 'local',
    name: 'Local',
    variables: [{ name: 'host', value: 'localhost:8080', enabled: true, secret: false }],
};

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
    path = join(root, 'workspaces', 'eventos-de-pagos', 'environments', 'local.yaml');

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

describe('writing an environment', () => {
    it('creates one file per environment, named after its id', async () => {
        await writeEnvironment(root, 'eventos-de-pagos', local);

        expect(await readEnvironment(root, 'eventos-de-pagos', 'local')).toEqual(local);
    });

    /** What the other app wrote and this one does not understand has to survive a rewrite. */
    it('keeps unknown keys and comments already in the file', async () => {
        await writeEnvironment(root, 'eventos-de-pagos', local);

        const source = await readFile(path, 'utf8');

        await writeFile(path, `# entorno de desarrollo\n${source}retries: 3\n`, 'utf8');
        await writeEnvironment(root, 'eventos-de-pagos', { ...local, name: 'Local dev' });

        const written = await readFile(path, 'utf8');

        expect(written).toContain('# entorno de desarrollo');
        expect(written).toContain('retries: 3');
        expect(written).toContain('name: Local dev');
    });

    it('refuses an environment the domain rejects and writes nothing', async () => {
        await expect(
            writeEnvironment(root, 'eventos-de-pagos', {
                ...local,
                variables: [{ name: '$uuid', value: 'x', enabled: true, secret: false }],
            }),
        ).rejects.toThrow(FormatError);
        await expect(readEnvironment(root, 'eventos-de-pagos', 'local')).rejects.toThrow();
    });

    /** A file that cannot be parsed is never silently overwritten: the rewrite refuses. */
    it('refuses to rewrite an environment whose file cannot be parsed', async () => {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, 'id: [', 'utf8');

        await expect(writeEnvironment(root, 'eventos-de-pagos', local)).rejects.toThrow(
            FileReadError,
        );
        expect(await readFile(path, 'utf8')).toBe('id: [');
    });
});

const withToken = {
    ...local,
    variables: [{ name: 'TOKEN', value: 'abc123', enabled: true, secret: true }],
};

describe('writing an environment that declares a secret', () => {
    it('leaves the value of a secret variable out of the file', async () => {
        await writeEnvironment(root, 'eventos-de-pagos', withToken, () => Promise.resolve());

        await expect(readFile(path, 'utf8')).resolves.not.toContain('abc123');
    });

    it('hands the value of every secret variable to the keeper', async () => {
        const kept: KeptSecret[][] = [];

        await writeEnvironment(root, 'eventos-de-pagos', withToken, (secrets) => {
            kept.push([...secrets]);

            return Promise.resolve();
        });

        expect(kept).toEqual([[{ name: 'TOKEN', value: 'abc123' }]]);
    });

    /**
     * The order is the whole point: a store that refuses has to leave the clear value where it
     * was. Rewriting first and keeping second loses the value with nowhere to recover it from.
     */
    it('does not rewrite the file when the keeper refuses the value', async () => {
        await writeEnvironment(root, 'eventos-de-pagos', {
            ...local,
            variables: [{ name: 'TOKEN', value: 'abc123', enabled: true, secret: false }],
        });

        await expect(
            writeEnvironment(root, 'eventos-de-pagos', withToken, () =>
                Promise.reject(new Error('no keychain')),
            ),
        ).rejects.toThrow('no keychain');
        await expect(readFile(path, 'utf8')).resolves.toContain('abc123');
    });

    /** Unmarking is not a way to bring a token back to a file that is versioned. */
    it('empties the value instead of restoring it when a variable stops being secret', async () => {
        await writeEnvironment(root, 'eventos-de-pagos', withToken, () => Promise.resolve());
        await writeEnvironment(root, 'eventos-de-pagos', {
            ...local,
            variables: [{ name: 'TOKEN', value: 'abc123', enabled: true, secret: false }],
        });

        const written = await readEnvironment(root, 'eventos-de-pagos', 'local');

        expect(written.variables).toEqual([
            { name: 'TOKEN', value: '', enabled: true, secret: false },
        ]);
    });

    it('keeps writing the value of a variable that is not secret', async () => {
        await writeEnvironment(root, 'eventos-de-pagos', local, () => Promise.resolve());

        await expect(readFile(path, 'utf8')).resolves.toContain('localhost:8080');
    });
});
