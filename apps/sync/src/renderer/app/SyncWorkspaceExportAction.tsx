import { ExportDialogAction } from '@mandor/exchange';

/**
 * Exporting a workspace is Sync's button on the page of the workspaces: the dialog is shared, the
 * formats are Sync's, and what it writes is the workspace that is open, as one Mandor file, or as
 * the files of Postman, Insomnia or Bruno.
 */
export function SyncWorkspaceExportAction() {
    return (
        <ExportDialogAction
            formats={[
                { id: 'mandor', label: 'Mandor' },
                { id: 'postman', label: 'Postman' },
                { id: 'insomnia', label: 'Insomnia' },
                { id: 'bruno', label: 'Bruno' },
            ]}
            scope="workspace"
        />
    );
}
