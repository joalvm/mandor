import { settleConflict } from '../choice/settle-conflict.js';
import {
    conflictOf,
    type Decide,
    type MergeConflict,
    type MergeResult,
} from '../value/merge-conflict.js';

/** The text of a file on each side. `null` means the file is not there on that side. */
export type FileSides = { base: string | null; ours: string | null; theirs: string | null };

/** The merged file and the questions left. `null` as a text means «the file is not there». */
export type FileMerge = { text: string | null; conflicts: MergeConflict[] };

/** A merge that only ever yields text (or nothing) is a merged file. */
export function fileMergeOf(result: MergeResult): FileMerge {
    const { value, conflicts } = result;

    return { text: typeof value === 'string' ? value : null, conflicts };
}

/**
 * The file as a whole is the question: it cannot be read, it is of no kind the merge knows, or
 * one side deleted what the other changed. Ours stays, deletion included, until someone answers.
 */
export function askAboutFile(sides: FileSides, decide: Decide): FileMerge {
    const conflict = conflictOf('file', {
        base: sides.base ?? undefined,
        ours: sides.ours ?? undefined,
        theirs: sides.theirs ?? undefined,
        path: [],
    });

    return fileMergeOf(settleConflict(conflict, decide));
}
