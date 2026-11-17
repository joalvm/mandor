import { ExportDialogAction } from '@mandor/exchange';

/**
 * Exporting a workspace is Async's button on the page of the workspaces: the dialog is shared, the
 * formats are the ones Async has for a whole workspace, and what it writes is the workspace that
 * is open, as one Mandor file, or as the files of Insomnia or Bruno with its WebSocket connections.
 */
export function AsyncWorkspaceExportAction() {
    return (
        <ExportDialogAction
            formats={[
                { id: 'mandor', label: 'Mandor' },
                { id: 'insomnia', label: 'Insomnia' },
                { id: 'bruno', label: 'Bruno' },
            ]}
            scope="workspace"
        />
    );
}
