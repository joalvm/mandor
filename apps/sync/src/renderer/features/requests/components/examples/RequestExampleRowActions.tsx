import { itemResource, useCollectionRow } from '@mandor/collections';
import { useMessages } from '@mandor/i18n';
import { AddIcon, SaveIcon } from '@mandor/icons';
import { REQUEST_ITEM_KIND } from '@mandor/schema';
import { fireAndForget, originName } from '@mandor/shell';
import { MenuItem } from '@mandor/ui';
import { useStore } from 'zustand';

import { useExampleActions } from '../../hooks/useExampleActions.js';
import { requestsStore } from '../../requests-store.js';
import type { SendEntry } from '../../responses.slice.js';

/**
 * The lines of the menu of a request that have to do with its examples: make a new one, and keep
 * the answer it just got as one. Another kind of item has no such lines.
 */
export function RequestExampleRowActions() {
    const { node, workspaceId } = useCollectionRow();

    if (node.kind !== 'item' || node.itemKind !== REQUEST_ITEM_KIND) {
        return null;
    }

    return <RequestExampleLines path={node.path} workspaceId={workspaceId} />;
}

type RequestExampleLinesProps = { path: string; workspaceId: string };

function RequestExampleLines({ path, workspaceId }: RequestExampleLinesProps) {
    const labels = useMessages('requests');
    const actions = useExampleActions();
    const resource = itemResource(originName(), workspaceId, path);
    const entry = useStore(requestsStore, (state) => state.sends[resource]);

    return (
        <>
            <MenuItem
                onSelect={() => {
                    fireAndForget(actions.newExample(resource));
                }}
            >
                <AddIcon />
                {labels('newExample')}
            </MenuItem>
            <SaveResponseLine
                entry={entry}
                onSave={(response) => {
                    fireAndForget(actions.saveResponse(resource, response));
                }}
            />
        </>
    );
}

type SaveResponseLineProps = {
    entry: SendEntry | undefined;
    onSave: (response: Extract<SendEntry, { state: 'done' }>['response']) => void;
};

/** Offered once the request has an answer to keep: a send that is done. */
function SaveResponseLine({ entry, onSave }: SaveResponseLineProps) {
    const labels = useMessages('requests');

    if (entry?.state !== 'done') {
        return null;
    }

    return (
        <MenuItem
            onSelect={() => {
                onSave(entry.response);
            }}
        >
            <SaveIcon />
            {labels('saveResponseAsExample')}
        </MenuItem>
    );
}
