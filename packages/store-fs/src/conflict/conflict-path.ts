import { createHash } from 'node:crypto';
import { join } from 'node:path';

import { mandorDir } from '../repo/repo-path.js';

const CONFLICTS_DIR = 'conflicts';
const ID_LENGTH = 16;
const ID_PATTERN = /^[0-9a-f]{16}$/;

/** Where the clashes wait, inside `.mandor`: they never go to git. */
export function conflictsDir(root: string): string {
    return join(mandorDir(root), CONFLICTS_DIR);
}

/**
 * The id of the clash of one file: a hash of its repo path, so a second clash on the same file
 * lands on the same record, and the id is safe to put in a file name whatever the path says.
 */
export function conflictId(path: string): string {
    return createHash('sha1').update(path).digest('hex').slice(0, ID_LENGTH);
}

/** True for what `conflictId` produces. */
export function isConflictId(value: string): boolean {
    return ID_PATTERN.test(value);
}

/** Path of one record. The id is checked here, so what a caller joins cannot walk out. */
export function conflictFile(root: string, id: string): string {
    if (!isConflictId(id)) {
        throw new Error('A conflict is named by 16 hexadecimal characters');
    }

    return join(conflictsDir(root), `${id}.json`);
}
