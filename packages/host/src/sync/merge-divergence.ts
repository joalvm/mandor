import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { abortMerge, commitMessage, concludeMerge, mergeRemote, stageTexts } from '@mandor/git';
import { mergeFile } from '@mandor/merge';
import type { ChangedEntity, ConflictRecord } from '@mandor/schema';
import { atomicWrite, conflictId, removeConflict, writeConflict } from '@mandor/store-fs';

import type { StoredOrigin } from '../origin/stored-origin.js';
import { announceConflictRecorded } from '../repo/conflict-events.js';
import { entitiesOfPaths } from '../repo/entities-of-paths.js';
import { rememberDisk } from '../repo/remember-disk.js';

/** What a merge needs from the outside: the window to tell, and the log to leave a trace in. */
export type MergeDivergenceDeps = {
    /** Tells the window which entities the merge changed, so it reads them again. */
    push: (entities: ChangedEntity[]) => void;
    /** A clash nobody is asked about still leaves a line: it is where «why this version» is answered. */
    warn: (message: string) => void;
};

/** A path of the workspaces is the user's work; what lives outside them is the repo's own file. */
const WORKSPACES = 'workspaces/';

/**
 * What a clashed path becomes: the file written with the provisional text of the merge (ours
 * wherever the two clash) and, when something is left to answer, the record that keeps the two
 * texts it was merged from.
 */
async function answerPath(
    root: string,
    path: string,
    warn: MergeDivergenceDeps['warn'],
): Promise<ConflictRecord | null> {
    const texts = await stageTexts(root, path);
    const merged = mergeFile({ path, ...texts });
    const file = join(root, path);

    if (merged.text === null) {
        await rm(file, { force: true });
    } else {
        await mkdir(dirname(file), { recursive: true });
        await atomicWrite(file, merged.text);
    }

    if (merged.conflicts.length === 0) {
        return null;
    }

    if (!path.startsWith(WORKSPACES)) {
        warn(`a change of ${path} in ${root} clashed and this copy kept its own`);

        return null;
    }

    return {
        path,
        source: 'merge',
        base: texts.base,
        theirs: texts.theirs,
        at: new Date().toISOString(),
    };
}

/** The repo is never left half merged: what was written is taken back, and the tree with it. */
async function undo(root: string, kept: readonly string[]): Promise<void> {
    for (const path of kept) {
        await removeConflict(root, conflictId(path));
    }

    // Nothing to abort when the merge never opened; the failure that matters is the first one.
    await abortMerge(root).catch(() => undefined);
}

/** The merge, written down: every clash kept as a record before the commit that closes it. */
async function mergeAndRecord(
    origin: Pick<StoredOrigin, 'name' | 'root'>,
    deps: MergeDivergenceDeps,
    kept: string[],
): Promise<{ changed: string[]; records: ConflictRecord[] }> {
    const { root } = origin;
    const { conflicted } = await mergeRemote(root);
    const records: ConflictRecord[] = [];

    for (const path of conflicted) {
        const record = await answerPath(root, path, deps.warn);

        if (record !== null) {
            await writeConflict(root, record);
            kept.push(path);
            records.push(record);
        }
    }

    const message = commitMessage({ kind: 'merge-origin', name: origin.name });

    return { changed: await concludeMerge(root, conflicted, message), records };
}

/**
 * Closes a divergence with a commit of merge: what git joins by itself stays joined, and
 * `@mandor/merge` answers what git marks as a clash, file by file. What neither can decide is
 * written provisionally with this side's version and kept as a record for a person. It runs
 * in the turn of the repo and over a clean tree, the way a step of synchronization calls it.
 *
 * The repo never stays half merged: a failure of git or of the disk aborts the merge, takes
 * the records back and throws. The window is told what the merge changed, and each record
 * reaches the notice of the clash.
 */
export async function mergeDivergence(
    origin: Pick<StoredOrigin, 'name' | 'root'>,
    deps: MergeDivergenceDeps,
): Promise<{ records: number }> {
    const kept: string[] = [];
    const done = await mergeAndRecord(origin, deps, kept).catch(async (error: unknown) => {
        await undo(origin.root, kept);

        throw error;
    });

    await rememberDisk(origin.root, done.changed);

    const entities = entitiesOfPaths(done.changed);

    if (entities.length > 0) {
        deps.push(entities);
    }

    for (const record of done.records) {
        announceConflictRecorded(origin.root, record.path);
    }

    return { records: done.records.length };
}
