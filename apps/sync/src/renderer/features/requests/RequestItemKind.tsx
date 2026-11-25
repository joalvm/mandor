import { ItemBody, ItemExampleMark, ItemKind, ItemMark, ItemStatus } from '@mandor/collections';
import { SendIcon } from '@mandor/icons';
import { REQUEST_ITEM_KIND } from '@mandor/schema';
import { useEffect } from 'react';

import { useExampleActions } from './hooks/useExampleActions.js';
import { useScriptConsole } from './hooks/useScriptConsole.js';
import { useSendConsole } from './hooks/useSendConsole.js';
import { releaseRequestItem } from './lib/release-example.js';
import { followScriptOutput } from './lib/script-output-store.js';
import { requestHasDraft, saveRequestAndExamples } from './lib/request-example-drafts.js';
import { requestsStore } from './requests-store.js';
import { ExampleStatusMark } from './components/examples/ExampleStatusMark.js';
import { RequestDraftMark } from './components/panel/RequestDraftMark.js';
import { RequestMethodMark } from './components/panel/RequestMethodMark.js';
import { RequestPanel } from './components/panel/RequestPanel.js';

/**
 * What Sync knows that the collection does not: an item of kind request is drawn by this feature.
 * The package never names the kind, so Async declares its own and neither sees the other.
 * A request always opens a tab of its own: its destination lives inside it, and there is no
 * connection to hand it to. The tab says when the draft is not on the file yet: Sync puts a
 * request on disk when the person saves it, and not before. While the kind is declared, what
 * the scripts of each send say is kept for the answer that shows it.
 */
export function RequestItemKind() {
    const { logic } = useExampleActions();

    // The kind lives as long as the window: it follows the scripts from mount to unmount.
    useEffect(() => followScriptOutput(), []);
    useScriptConsole();
    useSendConsole();

    return (
        <ItemKind
            component={SendIcon}
            // A draft nobody saved: Sync puts a request on disk when the person says so.
            dirty={(resource) => requestHasDraft(requestsStore.getState(), resource)}
            examples={logic}
            kind={REQUEST_ITEM_KIND}
            newLabel="requests:newRequest"
            release={releaseRequestItem}
            save={saveRequestAndExamples}
        >
            <ItemMark>
                <RequestMethodMark />
            </ItemMark>
            <ItemExampleMark>
                <ExampleStatusMark />
            </ItemExampleMark>
            <ItemBody>
                <RequestPanel />
            </ItemBody>
            <ItemStatus>
                <RequestDraftMark />
            </ItemStatus>
        </ItemKind>
    );
}
