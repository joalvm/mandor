import { join } from 'node:path';

import type { ConflictRecord } from '@mandor/schema';

import { namesOrNone } from '../disk/directory-entries.js';
import type { LoadWarning } from '../disk/load-warning.js';
import { conflictsDir, isConflictId } from './conflict-path.js';
import { readConflictFile } from './read-conflict.js';

export type ListedConflicts = {
    conflicts: { id: string; record: ConflictRecord }[];
    warnings: LoadWarning[];
};

const EXTENSION = '.json';

/** Reads every record, in the order of their ids. A broken file is a warning and the rest load. */
export async function listConflicts(root: string): Promise<ListedConflicts> {
    const dir = conflictsDir(root);
    const names = await namesOrNone(dir);
    const ids = names
        .filter((name) => name.endsWith(EXTENSION))
        .map((name) => name.slice(0, -EXTENSION.length))
        .filter(isConflictId)
        .sort();
    const reads = await Promise.all(
        ids.map(async (id) => ({
            id,
            read: await readConflictFile(join(dir, `${id}${EXTENSION}`)),
        })),
    );

    return {
        conflicts: reads.flatMap(({ id, read }) => (read.ok ? [{ id, record: read.record }] : [])),
        warnings: reads.flatMap(({ read }) => (read.ok ? [] : [read.warning])),
    };
}
