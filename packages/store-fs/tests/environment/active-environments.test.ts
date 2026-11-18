import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readActiveEnvironments, writeActiveEnvironments } from '../../src/index.js';
import { activeEnvironmentsFile } from '../../src/environment/active-environments.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('active environments', () => {
    it('writes every workspace choice atomically under the private directory', async () => {
        await writeActiveEnvironments(root, { payments: 'local', events: 'staging' });

        expect(await readActiveEnvironments(root)).toEqual({
            payments: 'local',
            events: 'staging',
        });
        expect(await readFile(activeEnvironmentsFile(root), 'utf8')).toContain('payments: local');
    });

    it('starts empty when no choice was stored', async () => {
        await expect(readActiveEnvironments(root)).resolves.toEqual({});
    });

    /** A choice is cheap to make again; a file that is not YAML must not stop the next one. */
    it('reads a file that is not YAML as no choice at all', async () => {
        await mkdir(join(root, '.mandor'), { recursive: true });
        await writeFile(activeEnvironmentsFile(root), 'payments: [local\n', 'utf8');

        await expect(readActiveEnvironments(root)).resolves.toEqual({});
    });

    it('reports a private directory that cannot be traversed', async () => {
        await mkdir(join(root, '.mandor', 'active-environments.yaml'), { recursive: true });

        await expect(readActiveEnvironments(root)).rejects.toThrow();
    });
});
