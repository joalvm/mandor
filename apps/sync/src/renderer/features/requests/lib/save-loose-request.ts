import { itemResource, loadCollection } from '@mandor/collections';
import { failure, success, type Result } from '@mandor/ipc';
import { REQUEST_ITEM_KIND, requestItemBody } from '@mandor/schema';
import { bridge, originName } from '@mandor/shell';

import { requestsStore } from '../requests-store.js';
import { loosePartsOf } from './loose-resource.js';

type SaveTo = {
    name: string;
    /** The collection or folder it goes into. */
    parent: string;
    resource: string;
};

/**
 * Puts a request saved nowhere into the collection, as it stands on screen, under the name and in
 * the folder chosen; a name left blank keeps the one it wore. The name goes as it was written:
 * the item is filed under an id, so a sibling that reads the same is no clash. Answers the path
 * the item took; the request saved nowhere lets go of its draft, so the tab that held it closes
 * without asking.
 */
export async function saveLooseRequest({
    name,
    parent,
    resource,
}: SaveTo): Promise<Result<string>> {
    const workspaceId = loosePartsOf(resource)?.workspaceId;
    const request = requestsStore.getState().requests[resource];

    if (workspaceId === undefined || request === undefined) {
        return failure('unknown', 'the request is no longer in the window');
    }

    const typed = name.trim();
    const chosen = typed.length > 0 ? typed : request.name;
    const made = await bridge.collections.create({
        itemKind: REQUEST_ITEM_KIND,
        name: chosen,
        parent,
        workspaceId,
    });

    if (!made.ok) {
        return made;
    }

    const kept = { ...request, name: chosen };
    const written = await bridge.collections.writeItem({
        fields: { kind: REQUEST_ITEM_KIND, name: chosen, ...requestItemBody(kept) },
        path: made.value,
        workspaceId,
    });

    if (!written.ok) {
        return written;
    }

    requestsStore.getState().setRequest(itemResource(originName(), workspaceId, made.value), kept);
    requestsStore.getState().clearPending(resource);
    await loadCollection(workspaceId);

    return success(made.value);
}
