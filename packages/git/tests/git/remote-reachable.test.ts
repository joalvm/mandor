import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { remoteReachable } from '../../src/git/remote-reachable.js';
import { initRepo } from '../../src/repo/init-repo.js';

describe('checking whether an origin answers', () => {
    let dir: string;

    beforeEach(async () => {
        dir = await mkdtemp(join(tmpdir(), 'mandor-git-'));
    });

    afterEach(async () => {
        vi.unstubAllEnvs();
        await rm(dir, { force: true, recursive: true });
    });

    it('answers a remote that exists', async () => {
        const remote = join(dir, 'remote.git');

        await mkdir(remote);
        await initRepo(remote);

        await expect(remoteReachable({ url: remote })).resolves.toBeUndefined();
    });

    /** simple-git refuses a call that is handed a guarded name, and a session has plenty. */
    it('answers with the editor and the pager of the session in the environment', async () => {
        const remote = join(dir, 'remote.git');

        await mkdir(remote);
        await initRepo(remote);
        vi.stubEnv('EDITOR', 'vi');
        vi.stubEnv('PAGER', 'less');
        vi.stubEnv('GIT_EXEC_PATH', join(dir, 'elsewhere'));

        await expect(remoteReachable({ url: remote })).resolves.toBeUndefined();
    });

    it('rejects a remote that answers nothing', async () => {
        await expect(remoteReachable({ url: join(dir, 'nothing-here.git') })).rejects.toThrow();
    });
});
