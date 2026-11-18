import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { fetchRemote, pushBranch } from '@mandor/git';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { forgetTexts } from '../../src/repo/known-texts.js';
import { stepDepsOf } from '../../src/sync/step-deps.js';
import { syncStep } from '../../src/sync/sync-step.js';
import { machinesOf, pending, removeMachines, write, type TwoMachines } from './two-machines.js';

const exec = promisify(execFile);

const COOKIES = '.mandor/cookies.json';

let machines: TwoMachines;

const seeded = machinesOf({ 'notes.txt': 'seed\n' });

afterEach(async () => {
    forgetTexts(machines.mine.root);
    vi.unstubAllEnvs();
    await removeMachines(machines);
});

async function git(root: string, ...args: string[]): Promise<string> {
    const identity = ['-c', 'user.name=Other', '-c', 'user.email=o@example.test'];
    const { stdout } = await exec('git', [...identity, ...args], { cwd: root });

    return stdout.trim();
}

function stepOf(): ReturnType<typeof syncStep> {
    const origin = { ...machines.mine, kind: 'remote' as const };
    const deps = stepDepsOf(origin, () => Promise.resolve({ url: machines.bare.url }), vi.fn());

    return syncStep(origin, deps);
}

async function holdHere(text: string): Promise<void> {
    await mkdir(join(machines.mine.root, '.mandor'), { recursive: true });
    await writeFile(join(machines.mine.root, COOKIES), text, 'utf8');
}

/** The other machine sends a private file the way only a hand outside the app could: forced in. */
async function sendPrivate(text: string): Promise<void> {
    await mkdir(join(machines.theirs, '.mandor'), { recursive: true });
    await writeFile(join(machines.theirs, COOKIES), text, 'utf8');
    await git(machines.theirs, 'add', '-f', '--', COOKIES);
    await git(machines.theirs, 'commit', '-q', '-m', 'send cookies');
    await pushBranch(machines.theirs, { url: machines.bare.url });
}

function trackedOnServer(): Promise<string> {
    return git(machines.bare.path, 'ls-tree', '-r', '--name-only', 'main', '--', '.mandor');
}

/**
 * The private directory holds the session of this machine: cookies, tokens, history. A commit
 * of the origin that carries it would write over it in a move, or delete it; the step keeps
 * what this machine holds, takes the private files out of the branch and sends that.
 */
describe('a step that brings private files from the origin (sync-step)', () => {
    it('keeps the private files of this machine when the branch only moves forward', async () => {
        machines = await seeded();
        await holdHere('mine\n');
        await sendPrivate('theirs\n');

        await expect(stepOf()).resolves.toBe('clean');
        expect(await readFile(join(machines.mine.root, COOKIES), 'utf8')).toBe('mine\n');
        expect(await pending(machines.mine.root)).toBe('');
        expect(await trackedOnServer()).toBe('');
    });

    it('keeps them too when both sides went ahead and the two are merged', async () => {
        machines = await seeded();
        await holdHere('mine\n');
        await sendPrivate('theirs\n');
        await write(machines.mine.root, { 'notes.txt': 'mine\n' }, 'mine');
        await fetchRemote(machines.mine.root, { url: machines.bare.url });

        await expect(stepOf()).resolves.toBe('clean');
        expect(await readFile(join(machines.mine.root, COOKIES), 'utf8')).toBe('mine\n');
        expect(await trackedOnServer()).toBe('');
    });

    it('lays no private file of the origin where this machine held none', async () => {
        machines = await seeded();
        await sendPrivate('theirs\n');

        await expect(stepOf()).resolves.toBe('clean');
        expect(await readFile(join(machines.mine.root, COOKIES), 'utf8').catch(() => null)).toBe(
            null,
        );
    });
});
