import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import { resolveFile, type Decision } from '@mandor/merge';
import { IdError, type ConflictRecord } from '@mandor/schema';
import {
    atomicWrite,
    inTurn,
    listConflicts,
    readTextOrNull,
    removeConflict,
} from '@mandor/store-fs';

import { requestSync } from '../origin/origin-runtime.js';
import { announceConflictsChanged } from '../repo/conflict-events.js';
import { reshapeRepo } from '../repo/reshape-repo.js';
import { trackWrite } from '../runtime/write-drain.js';
import { clashOfRecord } from './clash-of-record.js';
import { ConflictOpenError } from './conflict-open-error.js';

/** The record the repo keeps under this id. An id with no record is a request that is wrong. */
async function recordOf(root: string, id: string): Promise<ConflictRecord> {
    const { conflicts } = await listConflicts(root);
    const kept = conflicts.find((each) => each.id === id);

    if (kept === undefined) {
        throw new IdError(id);
    }

    return kept.record;
}

/** The clash is closed: its record goes, the window asks for the list again, and the sync goes on. */
async function closed(root: string, id: string): Promise<void> {
    await removeConflict(root, id);
    announceConflictsChanged(root);
    requestSync();
}

/** The file with the answers in it, or gone when the answers leave nothing of it. */
async function writeAnswered(root: string, path: string, text: string | null): Promise<void> {
    const file = join(root, path);

    if (text === null) {
        await rm(file, { force: true });
    } else {
        await atomicWrite(file, text);
    }
}

/**
 * Closes a clash with the answers of a person. The merge runs again over the file as it is now
 * and the three texts the record kept, so an answer finds its question by id; if any question is
 * left open the clash stays as it was and nothing is written. What lands is committed in the act,
 * and the sync that was waiting for the clash goes on.
 */
export async function resolveConflict(
    root: string,
    id: string,
    choices: Readonly<Record<string, Decision>>,
): Promise<void> {
    const record = await recordOf(root, id);
    const clash = await clashOfRecord(root, record);

    // Every question was answered since, by hand or by the other side: only the record is left.
    if (clash === null) {
        return closed(root, id);
    }

    const change = { kind: 'resolve-conflict', name: clash.name } as const;

    await reshapeRepo({ root, paths: [record.path], change }, async () => {
        const ours = await readTextOrNull(join(root, record.path));
        const merged = resolveFile(
            { path: record.path, base: record.base, ours, theirs: record.theirs },
            choices,
        );

        if (merged.conflicts.length > 0) {
            throw new ConflictOpenError(id, merged.conflicts.length);
        }

        await writeAnswered(root, record.path, merged.text);
        await removeConflict(root, id);
    });
    announceConflictsChanged(root);
    requestSync();
}

/** Closes a clash leaving this copy as it is: the file keeps what it has and the sync goes on. */
export async function keepMine(root: string, id: string): Promise<void> {
    await recordOf(root, id);
    await trackWrite(inTurn(root, () => removeConflict(root, id)));
    announceConflictsChanged(root);
    requestSync();
}
