import { join } from 'node:path';

import type { ConflictItem } from '@mandor/ipc';
import { mergeFile } from '@mandor/merge';
import type { ChangedEntity, ConflictRecord } from '@mandor/schema';
import { entityOfPath, nameInText, readTextOrNull } from '@mandor/store-fs';

import { nameOnDisk } from '../repo/name-on-disk.js';

/** A clash that still has a question: the entity it belongs to, its name and its questions. */
export type Clash = {
    entity: ChangedEntity;
    name: string;
    conflicts: ConflictItem[];
};

/**
 * The name a person knows the clashed file by: the one it carries on disk now, as the other side
 * wrote it or as it was before. A file that carries none is read once more from disk, which gives
 * the order of a collection the name of its workspace; `''` when there is no name to give.
 */
async function nameOfClash(
    root: string,
    record: ConflictRecord,
    ours: string | null,
): Promise<string> {
    const named = [ours, record.theirs, record.base]
        .map((text) => (text === null ? '' : nameInText(record.path, text)))
        .find((name) => name !== '');

    return named ?? (await nameOnDisk(root, record.path));
}

/**
 * Works the questions of a record out again. «Mine» is the file as it is on disk now, so what
 * was edited after the provisional version counts, and a record whose questions are all
 * answered has none left: it answers `null`. A file that is gone is a side that is not there;
 * one that is there and cannot be read is a failure, never a side that was deleted.
 */
export async function clashOfRecord(root: string, record: ConflictRecord): Promise<Clash | null> {
    const ours = await readTextOrNull(join(root, record.path));
    const { conflicts } = mergeFile({
        path: record.path,
        base: record.base,
        ours,
        theirs: record.theirs,
    });

    if (conflicts.length === 0) {
        return null;
    }

    // A file out of the shape of a repo is still a clash: it is listed as the repo's own.
    const entity = entityOfPath(record.path) ?? { area: 'repo' as const };

    return { entity, name: await nameOfClash(root, record, ours), conflicts };
}
