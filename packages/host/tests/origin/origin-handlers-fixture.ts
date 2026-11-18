import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { closeOriginRuntime } from '../../src/origin/origin-runtime.js';
import { registerOriginHandlers } from '../../src/origin/origin.handlers.js';
import { rememberOrigin } from '../../src/origin/origins.js';
import { ensureLocalRepo } from '../../src/repo/ensure-local-repo.js';
import { silentReporting, spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { copiedRepo, type RepoCopy } from '../support/copied-repo.js';

/**
 * The electron double each consumer declares for itself: `vi.mock` is scoped to the test file
 * that calls it, so a shared module cannot carry it.
 *
 * ```ts
 * vi.mock('electron', async () => ({
 *     app: { getPath: () => '' },
 *     safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble(),
 * }));
 * ```
 */

export type OriginHandlersFixture = {
    base: string;
    dispose: () => void;
    exists: (...segments: string[]) => Promise<boolean>;
    ipc: IpcSpy;
    localRoot: string;
    userData: string;
};

/**
 * The repo of the local origin, laid out once for the file by the app itself and copied for each
 * test. Called at the top of the file, where hooks register.
 */
export function localOriginRepo(workspaceName = 'Personal'): RepoCopy {
    return copiedRepo(async (root) => {
        process.env['GIT_CONFIG_GLOBAL'] = `${root}-no-global-config`;
        process.env['GIT_CONFIG_SYSTEM'] = `${root}-no-system-config`;

        await ensureLocalRepo({ kind: 'async', name: 'Mandor', root, workspaceName });
    });
}

/**
 * A window's worth of origin handlers over real directories: the local origin seeded, its repo
 * copied in from `localRepo`, and the git configuration of the developer's machine fenced off.
 */
export async function setupOriginHandlers(localRepo: RepoCopy): Promise<OriginHandlersFixture> {
    const base = await mkdtemp(join(tmpdir(), 'mandor-origins-'));
    const userData = await mkdtemp(join(tmpdir(), 'mandor-user-'));
    const localRoot = join(base, 'local');

    process.env['MANDOR_DEFAULT_REPO_ROOT'] = join(base, 'container');
    process.env['GIT_CONFIG_GLOBAL'] = join(base, 'no-global-config');
    process.env['GIT_CONFIG_SYSTEM'] = join(base, 'no-system-config');

    const ipc = spyIpc();
    const dispose = registerOriginHandlers(ipc, {
        kind: 'async',
        userDataDir: userData,
        ...silentReporting(),
    });

    await localRepo(localRoot);
    await rememberOrigin(userData, { id: 'local', name: 'Local', kind: 'local', root: localRoot });

    const exists = (...segments: string[]): Promise<boolean> =>
        stat(join(...segments)).then(
            () => true,
            () => false,
        );

    return { base, dispose, exists, ipc, localRoot, userData };
}

export async function teardownOriginHandlers(fixture: OriginHandlersFixture): Promise<void> {
    fixture.dispose();
    closeOriginRuntime();
    setActiveOrigin(null);
    delete process.env['MANDOR_DEFAULT_REPO_ROOT'];

    // Windows holds the handles of git and of the watcher a moment after they close; the
    // retries keep the cleanup from failing a test that already passed.
    await rm(fixture.userData, { force: true, maxRetries: 5, recursive: true, retryDelay: 200 });
    await rm(fixture.base, { force: true, maxRetries: 5, recursive: true, retryDelay: 200 });
}
