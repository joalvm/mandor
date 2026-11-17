import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodiesBytes } from '../../src/body/bodies-bytes.js';
import { bodiesDir } from '../../src/body/body-path.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('measuring the store of bodies', () => {
    it('holds nothing before the first body', async () => {
        expect(await bodiesBytes(root)).toBe(0);
    });

    it('adds up the bytes of every file in it', async () => {
        await mkdir(bodiesDir(root), { recursive: true });
        await writeFile(join(bodiesDir(root), 'a'.repeat(64)), 'x'.repeat(1000));
        await writeFile(join(bodiesDir(root), 'b'.repeat(64)), 'y'.repeat(24));

        expect(await bodiesBytes(root)).toBe(1024);
    });

    /**
     * A body removed between the listing and its measure, as a prune running alongside does: a
     * link to nothing is listed and cannot be measured. A junction is the link Windows lets anyone
     * make; elsewhere the kind is ignored.
     */
    it('counts nothing for a file gone before it was measured', async () => {
        await mkdir(bodiesDir(root), { recursive: true });
        await writeFile(join(bodiesDir(root), 'a'.repeat(64)), 'x'.repeat(10));
        await symlink(join(root, 'nowhere'), join(bodiesDir(root), 'b'.repeat(64)), 'junction');

        expect(await bodiesBytes(root)).toBe(10);
    });
});
