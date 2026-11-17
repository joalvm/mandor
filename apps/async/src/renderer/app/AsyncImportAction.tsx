import { loadCollection } from '@mandor/collections';
import { ImportDialogAction } from '@mandor/exchange';
import { useMessages } from '@mandor/i18n';
import { fireAndForget } from '@mandor/shell';

/**
 * Importing is Async's door in the header of the collections: the dialog is shared, the format and
 * the words about it are Async's, and the collection it reloads is the one it just wrote.
 */
export function AsyncImportAction() {
    const messages = useMessages('async');

    return (
        <ImportDialogAction
            formats={[{ label: 'AsyncAPI', hint: messages('importHint'), input: 'files' }]}
            onImported={({ workspaceId }) => {
                fireAndForget(loadCollection(workspaceId));
            }}
            scope="collection"
        />
    );
}
