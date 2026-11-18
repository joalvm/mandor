import { WorkspaceAuthAction } from '@mandor/env';
import { WorkspaceListAction, WorkspacePanelAction } from '@mandor/workspace';

import { SyncWorkspaceExportAction } from './SyncWorkspaceExportAction.js';
import { SyncWorkspaceImportAction } from './SyncWorkspaceImportAction.js';

/**
 * What Mandor Request adds beside the form of the workspaces page, written out: the
 * import that makes a workspace, and the export of the one that is open. The API key
 * travels in a header, the query or a cookie: there is no handshake here.
 */
export function SyncPanelActions() {
    return (
        <>
            <WorkspacePanelAction id="auth">
                <WorkspaceAuthAction placements={['header', 'query', 'cookie']} />
            </WorkspacePanelAction>
            <WorkspacePanelAction id="export">
                <SyncWorkspaceExportAction />
            </WorkspacePanelAction>
            <WorkspaceListAction id="import">
                <SyncWorkspaceImportAction />
            </WorkspaceListAction>
        </>
    );
}
