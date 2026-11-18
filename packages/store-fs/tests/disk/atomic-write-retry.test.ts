import type * as Fs from 'node:fs/promises';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const refusals = vi.hoisted(() => ({ left: 0, code: 'EPERM', vanish: false, fullDisk: false }));

vi.mock('node:fs/promises', async () => {
    const actual = await vi.importActual<typeof Fs>('node:fs/promises');

    return {
        ...actual,
        open: async (...args: Parameters<typeof actual.open>) => {
            const handle = await actual.open(...args);

            if (refusals.fullDisk) {
                handle.sync = () =>
                    Promise.reject(Object.assign(new Error('full'), { code: 'ENOSPC' }));
            }

            return handle;
        },
        rename: async (from: string, to: string) => {
            if (refusals.left > 0) {
                refusals.left -= 1;

                if (refusals.vanish) {
                    await actual.rm(from);
                }

                throw Object.assign(new Error('refused'), { code: refusals.code });
            }

            await actual.rename(from, to);
        },
    };
});

import { atomicWrite } from '../../src/index.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-retry-'));
    refusals.code = 'EPERM';
    refusals.vanish = false;
    refusals.fullDisk = false;
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('writing a file atomically while the system refuses the rename', () => {
    it('tries again when the refusal is of the kind that passes', async () => {
        const path = join(root, 'mandor.yaml');

        refusals.left = 2;
        await atomicWrite(path, 'name: Nuevo\n');

        expect(await readFile(path, 'utf8')).toBe('name: Nuevo\n');
        expect(await readdir(root)).toEqual(['mandor.yaml']);
    });

    it('gives up after a few attempts and leaves no temporary', async () => {
        refusals.left = 100;

        await expect(atomicWrite(join(root, 'mandor.yaml'), 'x')).rejects.toThrow('refused');
        expect(await readdir(root)).toEqual([]);
    });

    it('does not retry a refusal that will not pass', async () => {
        refusals.left = 1;
        refusals.code = 'ENOSPC';

        await expect(atomicWrite(join(root, 'mandor.yaml'), 'x')).rejects.toThrow('refused');
        expect(refusals.left).toBe(0);
    });

    it('rejects with the refusal itself when the temporary is already gone', async () => {
        refusals.left = 1;
        refusals.code = 'ENOSPC';
        refusals.vanish = true;

        await expect(atomicWrite(join(root, 'mandor.yaml'), 'x')).rejects.toThrow('refused');
    });

    /** Inside a synced tree, a temporary left behind would travel to the user's other machines. */
    it('removes the temporary when the bytes never reach the disk', async () => {
        refusals.fullDisk = true;

        await expect(atomicWrite(join(root, 'mandor.yaml'), 'x')).rejects.toThrow('full');
        expect(await readdir(root)).toEqual([]);
    });
});
