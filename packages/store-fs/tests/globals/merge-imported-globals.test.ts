import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mergeImportedGlobals, mergeVariables } from '../../src/globals/merge-imported-globals.js';
import { readGlobals } from '../../src/globals/read-globals.js';
import { writeGlobals } from '../../src/globals/write-globals.js';
import { writeRepoTree } from '../../src/index.js';

let root: string;

function variable(name: string, value: string) {
    return { name, value, enabled: true, secret: false };
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-merge-globals-'));

    await writeRepoTree(root, 'Mi repo');
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('mergeVariables', () => {
    it('goes through what is there as it is and adds the new names last', () => {
        const merged = mergeVariables(
            [variable('a', '1'), variable('b', '2')],
            [variable('b', 'x'), variable('c', '3')],
        );

        expect(merged.map(({ name, value }) => [name, value])).toEqual([
            ['a', '1'],
            ['b', '2'],
            ['c', '3'],
        ]);
    });
});

describe('mergeImportedGlobals', () => {
    it('adds the names the origin lacks and keeps every value it has', async () => {
        await writeGlobals(root, { variables: [variable('region', 'us')] });

        expect(
            await mergeImportedGlobals(root, [variable('region', 'eu'), variable('host', 'h')]),
        ).toBe(true);
        expect(await readGlobals(root)).toEqual({
            variables: [variable('region', 'us'), variable('host', 'h')],
        });
    });

    it('writes nothing when every name is already there', async () => {
        await writeGlobals(root, { variables: [variable('region', 'us')] });

        expect(await mergeImportedGlobals(root, [variable('region', 'eu')])).toBe(false);
    });
});
