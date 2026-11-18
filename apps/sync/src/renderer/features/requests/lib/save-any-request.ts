import type { TabSaveOutcome } from '@mandor/shell';

import { saveToQuestion } from '../save-to-question.js';
import { loosePartsOf } from './loose-resource.js';
import { saveRequestAndExamples } from './request-example-drafts.js';

/**
 * Asks where a request saved nowhere goes. Answers nothing once it is in the collection, and
 * `kept` when the person chose to leave it where it was. `reopen` is for a tab that goes on as the
 * item it became; a tab that is closing leaves anyway.
 */
export function askWhereToSave(resource: string, reopen: boolean): Promise<TabSaveOutcome> {
    return saveToQuestion
        .getState()
        .ask(resource, reopen)
        .then((saved) => (saved ? null : 'kept'));
}

/**
 * Ctrl+S on any request: an item puts its draft on its file, and one saved nowhere first asks
 * where it goes — every time, edited or not, since it has no file to keep it yet.
 */
export function saveAnyRequest(resource: string): Promise<TabSaveOutcome> {
    if (loosePartsOf(resource) === null) {
        return saveRequestAndExamples(resource);
    }

    return askWhereToSave(resource, true);
}
