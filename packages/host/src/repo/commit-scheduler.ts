import { commitMessage, commitPaths, type RepoChange } from '@mandor/git';
import { inTurn } from '@mandor/store-fs';

import { trackWrite } from '../runtime/write-drain.js';
import { announceCommitFailed, announceCommitted } from './commit-events.js';

/**
 * How long an entity has to stay quiet before its edits become a commit. The renderer writes an
 * item after 400 ms of calm in the keyboard, so this one is longer on purpose: a pause in the
 * work is one commit, and the pauses between keystrokes are none.
 */
const COMMIT_QUIET_MS = 1500;

/** Everything one key has gathered while it waited: its paths, and how it will be named. */
type Pending = {
    change: RepoChange;
    paths: Set<string>;
    /** Empty for a key that failed and waits for the next flush, which is its next try. */
    timer: ReturnType<typeof setTimeout> | null;
};

const waiting = new Map<string, Map<string, Pending>>();
const inFlight = new Map<string, Set<Promise<void>>>();

/** What a write asks the scheduler for: the key it waits under and the paths it will commit. */
export type CommitRequest = {
    root: string;
    key: string;
    paths: string[];
    change: RepoChange;
};

/**
 * Asks for a commit of `paths` once `key` has been quiet for `quietMs`. Every call of the key
 * starts the calm again, adds its paths to the ones already waiting and replaces the change that
 * will name the commit: the last write is the one the history should read.
 */
export function scheduleCommit(request: CommitRequest, quietMs = COMMIT_QUIET_MS): void {
    const { root, key, paths, change } = request;
    const keys = keysOf(root);
    const earlier = keys.get(key);

    if (earlier?.timer) {
        clearTimeout(earlier.timer);
    }

    keys.set(key, {
        change,
        paths: new Set([...(earlier?.paths ?? []), ...paths]),
        timer: setTimeout(() => {
            void commitKey(root, key);
        }, quietMs),
    });
}

/** Whether `key` is waiting for its calm: an edit of the app that has not landed yet. */
export function hasPendingCommit(root: string, key: string): boolean {
    return waiting.get(root)?.has(key) === true;
}

/** Commits every key of the repo now, and answers once they and anything in the air landed. */
export async function flushCommits(root: string): Promise<void> {
    for (const key of [...(waiting.get(root)?.keys() ?? [])]) {
        void commitKey(root, key);
    }

    await Promise.all([...(inFlight.get(root) ?? [])]);
}

/** Flushes every repo, for the moment the app is about to leave. */
export async function flushAllCommits(): Promise<void> {
    await Promise.all([...waiting.keys(), ...inFlight.keys()].map((root) => flushCommits(root)));
}

/** Forgets what `key` was waiting to commit: the file it named is about to be taken back. */
export function cancelCommit(root: string, key: string): void {
    const earlier = waiting.get(root)?.get(key);

    if (earlier?.timer) {
        clearTimeout(earlier.timer);
    }

    waiting.get(root)?.delete(key);
}

function keysOf(root: string): Map<string, Pending> {
    const existing = waiting.get(root);

    if (existing !== undefined) {
        return existing;
    }

    const fresh = new Map<string, Pending>();

    waiting.set(root, fresh);

    return fresh;
}

/** Takes the key out of the wait and hands its commit to the turn, held until it settles. */
function commitKey(root: string, key: string): Promise<void> {
    const entry = waiting.get(root)?.get(key);

    if (entry === undefined) {
        return Promise.resolve();
    }

    if (entry.timer) {
        clearTimeout(entry.timer);
    }

    waiting.get(root)?.delete(key);

    return track(root, commit(root, key, entry));
}

async function commit(root: string, key: string, entry: Pending): Promise<void> {
    try {
        const made = await inTurn(root, () =>
            commitPaths(root, [...entry.paths], commitMessage(entry.change)),
        );

        if (made) {
            announceCommitted(root);
        }
    } catch (error) {
        giveBack(root, key, entry);

        announceCommitFailed(root, error);
    }
}

/** What git refused goes back to its key, joined with whatever the key gathered meanwhile. */
function giveBack(root: string, key: string, entry: Pending): void {
    const newer = keysOf(root).get(key);

    keysOf(root).set(key, {
        change: newer?.change ?? entry.change,
        paths: new Set([...entry.paths, ...(newer?.paths ?? [])]),
        timer: newer?.timer ?? null,
    });
}

/** Held by the drain of writes, so leaving the app waits for the commit and not only the file. */
function track(root: string, job: Promise<void>): Promise<void> {
    const jobs = inFlight.get(root) ?? new Set<Promise<void>>();
    const done = trackWrite(job).finally(() => {
        jobs.delete(done);
    });

    inFlight.set(root, jobs);
    jobs.add(done);

    return done;
}
