import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { initRepo } from '@mandor/git';
import { CHANNELS } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { approvalKey } from '../../src/script/approval-key.js';
import { createScriptVariables } from '../../src/script/script-variables.js';
import { openScripts, registerScriptsHandlers } from '../../src/script/scripts.handlers.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';

const exec = promisify(execFile);

const ORIGIN = 'local';

const SCRIPT = {
    workspaceId: 'ws-1',
    level: 'request',
    event: 'onBeforeRequest',
    source: 'fetch("https://evil.test")',
} as const;

const PLACES = [
    SCRIPT,
    { ...SCRIPT, workspaceId: 'ws-2' },
    { ...SCRIPT, event: 'onResponse' },
    { ...SCRIPT, level: 'folder' },
] as const;

let userData: string;
let root: string;
let ipc: IpcSpy;
let dispose: () => void;

/**
 * A repo as someone else would push it, by hand: `.mandor/` forced into a commit, with the approvals file
 * the app keeps, holding a valid hash for every place the script could sit.
 */
async function poisonedRepo(): Promise<string> {
    const repo = await mkdtemp(join(tmpdir(), 'mandor-poisoned-'));
    const hashes = PLACES.map((place) => approvalKey({ origin: ORIGIN, ...place }));

    await initRepo(repo);
    await mkdir(join(repo, '.mandor'), { recursive: true });
    await writeFile(
        join(repo, '.mandor', 'approved-scripts.txt'),
        `${hashes.join('\n')}\n`,
        'utf8',
    );
    await writeFile(join(repo, 'approved-scripts.txt'), `${hashes.join('\n')}\n`, 'utf8');
    await exec('git', ['add', '--all'], { cwd: repo });
    await exec('git', ['add', '--force', '.mandor/approved-scripts.txt'], { cwd: repo });
    await exec(
        'git',
        [
            '-c',
            'user.name=someone',
            '-c',
            'user.email=someone@evil.test',
            'commit',
            '--quiet',
            '--message',
            'approvals',
        ],
        { cwd: repo },
    );

    return repo;
}

async function tracked(repo: string): Promise<string[]> {
    const { stdout } = await exec('git', ['ls-files'], { cwd: repo });

    return stdout.split('\n').filter((line) => line !== '');
}

async function statusOf(scripts: readonly object[]): Promise<unknown> {
    const answer = (await ipc.call(CHANNELS.scriptsStatus, { scripts })) as {
        value?: { statuses: string[] };
    };

    return answer.value?.statuses;
}

beforeEach(async () => {
    userData = await mkdtemp(join(tmpdir(), 'mandor-user-data-'));
    root = await poisonedRepo();
    ipc = spyIpc();
    dispose = registerScriptsHandlers(ipc, {
        ...(await openScripts(userData, 'script-worker.js')),
        variables: createScriptVariables(),
    });
    setActiveOrigin({ id: ORIGIN, name: 'Local', kind: 'local', root });
});

afterEach(async () => {
    dispose();
    setActiveOrigin(null);
    await rm(userData, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
});

describe('approvals that come inside a repo', () => {
    it('approve nothing: not the text, not in another workspace, event or level', async () => {
        expect(await tracked(root)).toEqual(
            expect.arrayContaining(['.mandor/approved-scripts.txt', 'approved-scripts.txt']),
        );

        expect(await statusOf(PLACES)).toEqual([
            'unapproved',
            'unapproved',
            'unapproved',
            'unapproved',
        ]);
    });

    it('stay unapproved after the person approves the same text in one place', async () => {
        await ipc.call(CHANNELS.scriptsApprove, SCRIPT);

        expect(await statusOf(PLACES)).toEqual([
            'approved',
            'unapproved',
            'unapproved',
            'unapproved',
        ]);
    });
});
