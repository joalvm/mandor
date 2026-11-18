import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    createConnection,
    createWorkspace,
    FileReadError,
    writeRepoTree,
    updateConnection,
} from '../../src/index.js';

let root: string;
let path: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
    path = join(root, 'workspaces', 'eventos-de-pagos', 'connections', 'gateway-local.yaml');

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, {
        id: 'eventos-de-pagos',
        name: 'Eventos de pagos',
        kind: 'async',
    });
    await createConnection(root, 'eventos-de-pagos', {
        id: 'gateway-local',
        name: 'Gateway local',
        url: 'ws://localhost:8080',
    });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('updating a connection', () => {
    it('returns the connection with the change applied', async () => {
        const updated = await updateConnection(root, 'eventos-de-pagos', 'gateway-local', {
            url: 'wss://gateway.example.com',
        });

        expect(updated.url).toBe('wss://gateway.example.com');
        expect(await readFile(path, 'utf8')).toContain('url: wss://gateway.example.com');
    });

    /** The description of an item is a field of the item: it lives in its file and nowhere else. */
    it('writes the description of the item into the file of the item', async () => {
        const description = '# Gateway local\n\nQué hace y cuándo se usa.\n';

        const updated = await updateConnection(root, 'eventos-de-pagos', 'gateway-local', {
            description,
        });

        expect(updated.description).toBe(description);
        expect(await readFile(path, 'utf8')).toContain('Qué hace y cuándo se usa.');
    });

    /** A comment the user wrote in a connection file has to survive an edit from the app. */
    it('keeps comments and unknown keys already in the file', async () => {
        const source = await readFile(path, 'utf8');

        await writeFile(path, `# mi gateway\n${source}retries: 3\n`, 'utf8');
        await updateConnection(root, 'eventos-de-pagos', 'gateway-local', { name: 'Gateway' });

        const written = await readFile(path, 'utf8');

        expect(written).toContain('# mi gateway');
        expect(written).toContain('retries: 3');
        expect(written).toContain('name: Gateway');
    });

    it('refuses a change the domain rejects and leaves the file alone', async () => {
        await expect(
            updateConnection(root, 'eventos-de-pagos', 'gateway-local', {
                url: 'http://localhost:8080',
            }),
        ).rejects.toThrow();
        expect(await readFile(path, 'utf8')).toContain('url: ws://localhost:8080');
    });

    it('reports a connection that is not there', async () => {
        await expect(
            updateConnection(root, 'eventos-de-pagos', 'no-existe', { name: 'Otro' }),
        ).rejects.toThrow(FileReadError);
    });
});
