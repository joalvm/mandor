import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readGlobals } from '../../src/globals/read-globals.js';
import { writeRepoTree } from '../../src/index.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-globals-'));

    await writeRepoTree(root, 'Mi repo');
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('readGlobals', () => {
    it('reads an origin that never saved globals as one with none', async () => {
        expect(await readGlobals(root)).toEqual({ variables: [] });
    });

    it('reads the variables of globals.yaml', async () => {
        await writeFile(
            join(root, 'globals.yaml'),
            'variables:\n  - name: host\n    value: api.local\n    enabled: true\n    secret: false\n',
            'utf8',
        );

        expect(await readGlobals(root)).toEqual({
            variables: [{ name: 'host', value: 'api.local', enabled: true, secret: false }],
        });
    });

    it('refuses a file it cannot read instead of reading it as empty', async () => {
        await writeFile(join(root, 'globals.yaml'), 'variables: [\n', 'utf8');

        await expect(readGlobals(root)).rejects.toThrow();
    });
});
