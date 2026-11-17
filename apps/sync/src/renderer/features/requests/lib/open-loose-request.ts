import { createRequestItem, freeName, type RequestItem } from '@mandor/schema';
import { originName, shellStore } from '@mandor/shell';

import { requestsStore } from '../requests-store.js';
import {
    LOOSE_REQUEST_TAB_KIND,
    loosePartsOf,
    looseResource,
    looseTabId,
} from './loose-resource.js';
import { editRequest } from './pending-request-write.js';

/** The names the requests saved nowhere wear, so a new one does not repeat them. */
function looseNames(): string[] {
    return Object.entries(requestsStore.getState().requests).flatMap(([resource, request]) =>
        loosePartsOf(resource) === null ? [] : [request.name],
    );
}

/**
 * Opens a request saved nowhere in a group of the window: blank, under the word that says what
 * it is, numbered when another loose request already wears it. What it was brought in with — a
 * curl, say — fills it as an edit, so the tab asks about it before letting it go. It belongs to
 * the open workspace, and with no workspace open there is nowhere for it to send from.
 */
export function openLooseRequest(
    groupId: string,
    word: string,
    filled?: (blank: RequestItem) => RequestItem,
): void {
    const shell = shellStore.getState();
    const workspaceId = shell.activeWorkspaceId;

    if (workspaceId === null) {
        return;
    }

    const id = crypto.randomUUID();
    const resource = looseResource(originName(), workspaceId, id);
    const blank = createRequestItem({ name: freeName(word, looseNames()) });

    requestsStore.getState().setRequest(resource, blank);

    if (filled !== undefined) {
        editRequest(resource, filled(blank));
    }

    shell.openTab(groupId, { id: looseTabId(id), kind: LOOSE_REQUEST_TAB_KIND, resource });
}
