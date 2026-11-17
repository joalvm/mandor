import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    _electron as electron,
    expect,
    type ElectronApplication,
    type Page,
} from '@playwright/test';
import { launchElectron } from '../../../../../tools/workspace/launch-electron.mjs';

const APP_ROOT = join(import.meta.dirname, '../../..');

export type Sandbox = {
    defaultRepoRoot: string;
    repoRoot: string;
    root: string;
    userDataDir: string;
};

/**
 * The app lays its local origin out by itself on a machine that never ran, and by default it
 * does that inside the user's documents folder. Here it goes to the sandbox instead: the
 * machine running this may already have work there, with its own session and its own
 * connections, and a test that reads it is testing the developer's disk.
 */
export async function launch(
    userDataDir: string,
    defaultRepoRoot: string,
    extraEnv: Record<string, string> = {},
): Promise<{ app: ElectronApplication; page: Page }> {
    const app = await launchElectron(
        { electron, expect },
        {
            // Main has no `gc()` of its own; the memory readings need one to read it at rest.
            args: ['--js-flags=--expose-gc', APP_ROOT, `--user-data-dir=${userDataDir}`],
            env: {
                ...process.env,
                MANDOR_DEFAULT_REPO_ROOT: defaultRepoRoot,
                ...extraEnv,
            },
        },
    );
    const page = await app.firstWindow();

    return { app, page };
}

/**
 * Every path the run touches, under one directory the test owns and deletes. The variable
 * names the container; the repo of the app is one level further down, under its own kind.
 */
export async function makeSandbox(): Promise<Sandbox> {
    const root = await mkdtemp(join(tmpdir(), 'mandor-async-e2e-'));
    const defaultRepoRoot = join(root, 'default-repo');

    return {
        defaultRepoRoot,
        repoRoot: join(defaultRepoRoot, 'async', 'local'),
        root,
        userDataDir: join(root, 'user-data'),
    };
}
