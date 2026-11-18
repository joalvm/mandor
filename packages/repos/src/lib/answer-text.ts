import type { ConflictChoice, ConflictItem } from '@mandor/ipc';

import { describeSide } from './describe-side.js';

/**
 * The text an answer to a clash of texts writes, so the result pane always shows what the answer
 * would leave on disk. With no answer yet it is the merge by lines, or our side when there is none.
 */
export function answerText(item: ConflictItem, choice: ConflictChoice | undefined): string {
    if (choice === undefined) {
        return item.proposed ?? describeSide(item.ours, '').text;
    }

    if ('text' in choice) {
        return choice.text;
    }

    return describeSide(item[choice.pick], '').text;
}
