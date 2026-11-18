import type { FileMerge } from '../file/file-conflict.js';
import { mergeFileWith, type FileInput } from '../file/merge-file.js';
import type { Decision } from '../value/merge-conflict.js';

/**
 * The merge again, with the user's answers keyed by the id of each question. The merge is a pure
 * function of the three texts, so asking twice gives the same ids: an answer finds its question
 * without anything being stored between the two calls. Ids that match nothing are ignored.
 */
export function resolveFile(
    input: FileInput,
    choices: Readonly<Record<string, Decision>>,
): FileMerge {
    return mergeFileWith(input, (conflict) =>
        Object.hasOwn(choices, conflict.id) ? choices[conflict.id] : undefined,
    );
}
