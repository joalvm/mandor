import { existsSync, realpathSync, watch, type FSWatcher } from 'node:fs';
import { isAbsolute, join } from 'node:path';

import { batchPaths } from './batch-paths.js';
import type { DiskChange } from './disk-change.js';
import { diskChangesOf } from './disk-changes-of.js';
import { repoPathOfEvent } from './repo-path-of-event.js';

/** What the app owns and what git owns. A change in there is not a change to the repo. */
const IGNORED = ['.mandor', '.git'];

/** The only directory of the repo with domain below it: its subtree is the one worth watching. */
const WORKSPACES = 'workspaces';

/** One save fires several events. This window turns them into one batch. */
const WINDOW_MS = 50;

export type RepoWatcher = {
    dispose: () => void;
};

type Report = (event: string, path: string) => void;

/**
 * Watches a repo for changes made outside the app. It emits what happened to each path, never
 * its contents: whoever listens decides what is worth reloading and what is worth following.
 *
 * The root is watched without its subtree, for the repo file and the workspaces directory
 * itself, and only the workspaces are watched to the bottom. Where the system has no recursive
 * watch of its own (Linux), Node walks the subtree and keeps every file of it in memory: under
 * the root that would be all of git and of the private directory, which grow with every commit
 * and every send, and whose changes are never reported anyway.
 */
export function watchRepo(
    root: string,
    onBatch: (changes: DiskChange[]) => void,
    windowMs: number = WINDOW_MS,
): RepoWatcher {
    // Windows reports events against the real path of the directory. A watcher registered on
    // another spelling (an 8.3 short name, a `.` segment) dies on a native libuv assertion
    // that no try can catch. realpathSync throws on a missing root, as watch itself would.
    const real = realpathSync.native(root);
    const batch = batchPaths(windowMs, (paths) => {
        onBatch(diskChangesOf(paths, (path) => existsSync(join(real, path))));
    });
    const report: Report = (event, path) => {
        batch.add(path, event === 'rename');
    };

    const top = watch(real, { encoding: 'utf8' });
    const workspaces = workspacesWatch(join(real, WORKSPACES), report);
    const stop = (): void => {
        top.close();
        workspaces.close();
        batch.dispose();
    };

    top.on('change', (event, filename) => {
        // A repo that is gone has nothing left to watch. Windows would otherwise answer its
        // removal with events that never stop, each naming the directory by its absolute path.
        if (event === 'rename' && !existsSync(real)) {
            stop();

            return;
        }

        for (const path of watched(filename)) {
            report(event, path);

            // The directory came or went (a pull, a restore): its watch follows it. Only then:
            // Windows also names it, as a `change`, for every write below it.
            if (event === 'rename' && path === WORKSPACES) {
                workspaces.reopen();
            }
        }
    });
    // A watcher that failed is no longer usable, and an `error` nobody hears ends the process.
    top.on('error', stop);

    return { dispose: stop };
}

/**
 * The watch of the workspaces to the bottom, while the directory exists. Its paths are reported
 * as the repo spells them, from the root.
 */
function workspacesWatch(
    directory: string,
    report: Report,
): { close: () => void; reopen: () => void } {
    let current: FSWatcher | null = null;

    function close(): void {
        current?.close();
        current = null;
    }

    function reopen(): void {
        close();

        if (!existsSync(directory)) {
            return;
        }

        const opened = watch(directory, { recursive: true, encoding: 'utf8' });

        opened.on('change', (event, filename) => {
            for (const path of watched(filename)) {
                report(event, `${WORKSPACES}/${path}`);
            }
        });
        // A watch that failed is replaced the next time the directory comes back, or never.
        opened.on('error', close);
        current = opened;
    }

    reopen();

    return { close, reopen };
}

/**
 * The path worth reporting, spelled as the repo spells it, or nothing: some platforms report a
 * change without saying where. A path below the watched directory is relative; Windows answers
 * the removal of that directory with events naming it by its absolute path (`\\?\C:\…`), which
 * belong to no file of the repo. The watch above it reports the removal.
 */
function watched(filename: string | Buffer | null): string[] {
    return [filename]
        .filter((name) => typeof name === 'string')
        .filter((name) => !isAbsolute(name))
        .map((name) => repoPathOfEvent(name))
        .filter((path) => !isIgnored(path));
}

function isIgnored(path: string): boolean {
    const segments = path.split('/');

    return IGNORED.some((directory) => segments.includes(directory));
}
