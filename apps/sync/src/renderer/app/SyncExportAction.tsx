import { ExportDialogAction } from '@mandor/exchange';

/**
 * Exporting is Sync's door out of a collection: the dialog is shared, the formats are Sync's, and
 * what it writes is OpenAPI 3.1 in YAML, a collection of Postman or one of Insomnia, or the folder
 * of a collection of Bruno. It waits in the header of the collections for the line of a
 * collection's menu to ring it.
 */
export function SyncExportAction() {
    return (
        <ExportDialogAction
            formats={[
                { id: 'openapi', label: 'OpenAPI' },
                { id: 'postman', label: 'Postman' },
                { id: 'insomnia', label: 'Insomnia' },
                { id: 'bruno', label: 'Bruno' },
            ]}
            scope="collection"
        />
    );
}
