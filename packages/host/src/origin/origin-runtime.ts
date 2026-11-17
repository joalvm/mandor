import type { NetworkAccess } from '@mandor/git';
import { CHANNELS } from '@mandor/ipc';
import type { ChangedEntity, OriginKind, OriginSyncState } from '@mandor/schema';
import { entityOfPath, watchRepo, type RepoWatcher } from '@mandor/store-fs';

import { pushToWindow, type PushTarget } from '../ipc/push-to-window.js';
import type { Logger } from '../log/create-logger.js';
import { onConflictRecorded, onConflictsChanged } from '../repo/conflict-events.js';
import { forgetTexts } from '../repo/known-texts.js';
import { nameOnDisk } from '../repo/name-on-disk.js';
import { followOutsideChanges } from '../repo/outside-changes.js';
import { stepDepsOf } from '../sync/step-deps.js';
import { startSyncLoop, type SyncLoop } from '../sync/sync-loop.js';
import { onSyncStateChanged, syncStateOf } from '../sync/sync-state.js';
import { syncStep } from '../sync/sync-step.js';
import type { StoredOrigin } from './stored-origin.js';

type Running = {
    root: string;
    watcher: RepoWatcher;
    loop: SyncLoop | null;
};

/** What the origin needs to be followed against its remote: what kind it is and how to reach it. */
export type OriginSync = {
    name: string;
    kind: OriginKind;
    access: () => Promise<NetworkAccess>;
};

let running: Running | null = null;
let window: PushTarget | null = null;

/**
 * Hands the runtime the window it speaks to. Until there is one, what the disk says is heard
 * and dropped; once there is, the window hears the files that changed under it and the clashes
 * that were kept. Answers how to take the window back.
 */
export function bindRuntimeWindow(target: PushTarget): () => void {
    window = target;

    const stopClashes = onConflictRecorded((root, path) => {
        const entity = entityOfPath(path);

        if (entity === null) {
            return;
        }

        // The name is read as the clash is announced: the window never gets a path to name it by.
        void nameOnDisk(root, path).then((name) => {
            if (window === target) {
                pushToWindow(target, CHANNELS.conflictRecorded, { entity, name });
            }
        });
    });

    const stopList = onConflictsChanged((root) => {
        if (running?.root === root && window === target) {
            pushToWindow(target, CHANNELS.conflictChanged, {});
        }
    });

    const stopState = onSyncStateChanged((root, state) => {
        if (running?.root === root && window === target) {
            pushToWindow(target, CHANNELS.originStateChanged, state);
        }
    });

    return () => {
        stopClashes();
        stopList();
        stopState();

        if (window === target) {
            window = null;
        }
    };
}

function pushChanges(changes: ChangedEntity[]): void {
    if (window !== null) {
        pushToWindow(window, CHANNELS.repoChanged, { changes });
    }
}

/**
 * Starts what the open origin needs alive while the window works in it: the watcher of its
 * files and, when it is told how to reach its remote, the loop that keeps the two in step. The
 * origin before it, if any, is closed first, so there is never more than one.
 */
export function openOriginRuntime(
    origin: Pick<StoredOrigin, 'root'>,
    logger: Logger,
    sync?: OriginSync,
): void {
    closeOriginRuntime();

    const { root } = origin;

    const opened: Running = {
        root,
        watcher: watchRepo(root, (changes) => {
            // A batch that could not be followed leaves the window on what it had: worth a line
            // in the log, not a fault of the process.
            void followOutsideChanges(root, changes, pushChanges).catch((error: unknown) => {
                logger.log(
                    'warn',
                    `an edit made outside the app was not followed: ${String(error)}`,
                );
            });
        }),
        loop: null,
    };

    running = opened;

    // After `running` is set: the loop says its first state at once, and the window hears it.
    opened.loop =
        sync === undefined ? null : loopOf({ root, kind: sync.kind, name: sync.name }, sync);
}

function loopOf(origin: Pick<StoredOrigin, 'root' | 'kind' | 'name'>, sync: OriginSync): SyncLoop {
    const deps = stepDepsOf(origin, sync.access, pushChanges);

    return startSyncLoop(origin, () => syncStep(origin, deps));
}

/** Asks the loop of the open origin for a step: the window took the focus, or a clash was answered. */
export function requestSync(): void {
    running?.loop?.request();
}

/** Where the open origin stands against its remote, or nothing when no loop follows it. */
export function openSyncState(): OriginSyncState | null {
    return running === null ? null : syncStateOf(running.root);
}

/** Stops the watcher of the origin the window leaves and forgets what the window believed. */
export function closeOriginRuntime(): void {
    if (running === null) {
        return;
    }

    running.watcher.dispose();
    running.loop?.dispose();
    forgetTexts(running.root);
    running = null;
}
