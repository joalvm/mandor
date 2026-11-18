import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createWorkspace, readWorkspace, writeRepoTree } from '../../src/index.js';
import { writeDefaultEnvironment } from '../../src/workspace/write-default-environment.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-default-env-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, { id: 'pagos', name: 'Pagos', kind: 'sync' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('writeDefaultEnvironment', () => {
    it('sets the default and takes it out, and nothing else of the file moves', async () => {
        const file = join(root, 'workspaces', 'pagos', 'workspace.yaml');

        await writeFile(file, `# a mano\n${await readFile(file, 'utf8')}`, 'utf8');
        await writeDefaultEnvironment(root, 'pagos', 'base');

        const read = await readWorkspace(root, 'pagos');

        expect(read.ok && read.value.defaultEnvironment).toBe('base');
        expect(await readFile(file, 'utf8')).toContain('# a mano');

        await writeDefaultEnvironment(root, 'pagos', null);

        expect(await readFile(file, 'utf8')).not.toContain('defaultEnvironment');
    });

    it('refuses an id that is not a slug', async () => {
        await expect(writeDefaultEnvironment(root, 'pagos', 'No Slug')).rejects.toThrow();
    });
});
