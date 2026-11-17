import { settleConflict } from '../choice/settle-conflict.js';
import { conflictOf, type MergeInput, type MergeResult } from './merge-conflict.js';

/** Both sides moved a value that cannot be merged: ours stays until the user picks a side. */
export function askAboutValue(input: MergeInput): MergeResult {
    return settleConflict(conflictOf('value', input), input.decide);
}
