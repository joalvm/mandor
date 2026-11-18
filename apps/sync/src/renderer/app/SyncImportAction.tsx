import { loadCollection } from '@mandor/collections';
import { envStore } from '@mandor/env';
import { ImportDialogAction } from '@mandor/exchange';
import { useMessages } from '@mandor/i18n';
import { fireAndForget } from '@mandor/shell';

import { CurlImportField } from '../features/requests/index.js';

/**
 * Importing is Sync's door in the header of the collections: the dialog is shared, the formats and
 * the words about them are Sync's, and what it reloads is what it wrote: the collection and the
 * environments a document may bring, one per server of an OpenAPI. A workspace just made has none
 * on screen yet, and its files are not watched until it has been read once. A curl command pasted
 * there skips the document and opens as a request saved nowhere yet.
 */
export function SyncImportAction() {
    const messages = useMessages('sync');

    return (
        <ImportDialogAction
            formats={[
                { label: 'OpenAPI', hint: messages('importHint'), input: 'files' },
                { label: 'Postman', hint: messages('importPostmanHint'), input: 'files' },
                { label: 'Insomnia', hint: messages('importInsomniaHint'), input: 'files' },
                { label: 'Bruno', hint: messages('importBrunoHint'), input: 'folder' },
                { label: 'HAR', hint: messages('importHarHint'), input: 'files' },
            ]}
            onImported={({ workspaceId }) => {
                fireAndForget(loadCollection(workspaceId));
                fireAndForget(envStore.getState().load(workspaceId));
            }}
            scope="collection"
        >
            <CurlImportField />
        </ImportDialogAction>
    );
}
