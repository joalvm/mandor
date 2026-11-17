import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { approvedScripts } from '../../src/script/approved-scripts.js';

let userDataDir: string;

beforeEach(async () => {
    userDataDir = await mkdtemp(join(tmpdir(), 'approved-scripts-'));
});

afterEach(async () => {
    await rm(userDataDir, { recursive: true, force: true });
});

function hash(n: number): string {
    return n.toString(16).padStart(64, '0');
}

function file(): string {
    return join(userDataDir, 'approved-scripts.txt');
}

async function lines(): Promise<string[]> {
    return (await readFile(file(), 'utf8')).split('\n').filter((line) => line !== '');
}

describe('approvedScripts', () => {
    it('knows nothing when there is no file, and does not make one by asking', async () => {
        const store = approvedScripts(userDataDir);

        expect(await store.isApproved(hash(1))).toBe(false);
        await expect(readFile(file(), 'utf8')).rejects.toThrow();
    });

    it('keeps what was approved, in the file and for the next start', async () => {
        const store = approvedScripts(userDataDir);

        await store.approve(hash(1));
        await store.approve(hash(1));
        await store.approve(hash(2));

        expect(await store.isApproved(hash(1))).toBe(true);
        expect(await store.isApproved(hash(3))).toBe(false);
        expect(await lines()).toEqual([hash(1), hash(2)]);

        const restarted = approvedScripts(userDataDir);

        expect(await restarted.isApproved(hash(2))).toBe(true);
        expect(await restarted.isApproved(hash(3))).toBe(false);
    });

    it('ignores a broken line and keeps the rest, and cleans the file', async () => {
        await writeFile(file(), `${hash(1)}\nnot a hash\n\n${hash(10).toUpperCase()}\n${hash(3)}`);

        const store = approvedScripts(userDataDir);

        expect(await store.isApproved(hash(1))).toBe(true);
        expect(await store.isApproved(hash(3))).toBe(true);
        expect(await store.isApproved(hash(10))).toBe(false);
        expect(await lines()).toEqual([hash(1), hash(3)]);
    });

    it('does not glue an approval to a last line that ended without a line break', async () => {
        await writeFile(file(), hash(1));

        const store = approvedScripts(userDataDir);

        await store.approve(hash(2));

        const restarted = approvedScripts(userDataDir);

        expect(await restarted.isApproved(hash(1))).toBe(true);
        expect(await restarted.isApproved(hash(2))).toBe(true);
    });

    it('compacts to the last 5000 when it loads', async () => {
        const all = Array.from({ length: 5100 }, (_unused, index) => hash(index + 1));

        await writeFile(file(), `${all.join('\n')}\n`);

        const store = approvedScripts(userDataDir);

        expect(await store.isApproved(hash(100))).toBe(false);
        expect(await store.isApproved(hash(101))).toBe(true);
        expect(await store.isApproved(hash(5100))).toBe(true);
        expect(await lines()).toEqual(all.slice(100));
    });

    it('does not lose a line approved while the file is still compacting', async () => {
        const all = Array.from({ length: 5100 }, (_unused, index) => hash(index + 1));

        await writeFile(file(), `${all.join('\n')}\n`);

        const store = approvedScripts(userDataDir);
        const asked = store.isApproved(hash(5100));
        const approved = store.approve(hash(9000));

        expect(await asked).toBe(true);
        await approved;
        expect(await lines()).toEqual([...all.slice(100), hash(9000)]);
        expect(await approvedScripts(userDataDir).isApproved(hash(9000))).toBe(true);
    });

    it('forgets all of it, and an approval that came before in the queue does not survive', async () => {
        const store = approvedScripts(userDataDir);

        await store.approve(hash(1));

        const approving = store.approve(hash(2));
        const forgetting = store.forgetAll();

        await Promise.all([approving, forgetting]);

        expect(await store.isApproved(hash(1))).toBe(false);
        expect(await store.isApproved(hash(2))).toBe(false);
        expect(await readFile(file(), 'utf8')).toBe('');
        expect(await approvedScripts(userDataDir).isApproved(hash(2))).toBe(false);
    });

    it('approves again after forgetting', async () => {
        const store = approvedScripts(userDataDir);

        await store.forgetAll();
        await store.approve(hash(4));

        expect(await lines()).toEqual([hash(4)]);
    });

    it('serves the next job when one fails, and fails only that one', async () => {
        const blocked = join(userDataDir, 'blocked');

        await writeFile(blocked, '');

        const broken = approvedScripts(blocked);
        const failing = broken.approve(hash(1));
        const queued = broken.approve(hash(2));

        // A folder under a file: Linux and macOS answer ENOTDIR, Windows ENOENT. A read there is
        // no proof of a failure: Windows answers it as a file that is not there, approved nothing.
        await expect(failing).rejects.toThrow(/ENOTDIR|ENOENT/u);
        await expect(queued).rejects.toThrow(/ENOTDIR|ENOENT/u);

        await rm(blocked);
        await mkdir(blocked);

        expect(await broken.isApproved(hash(1))).toBe(false);
        await broken.approve(hash(1));
        expect(await broken.isApproved(hash(1))).toBe(true);
    });
});
