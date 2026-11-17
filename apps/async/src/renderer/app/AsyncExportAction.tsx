import { ExportDialogAction } from '@mandor/exchange';

/**
 * Exporting is Async's door out of a collection: the dialog is shared, the format is Async's, and
 * what it writes is AsyncAPI 3 in YAML. It waits in the header of the collections for the line of
 * a collection's menu to ring it.
 */
export function AsyncExportAction() {
    return (
        <ExportDialogAction formats={[{ id: 'asyncapi', label: 'AsyncAPI' }]} scope="collection" />
    );
}
