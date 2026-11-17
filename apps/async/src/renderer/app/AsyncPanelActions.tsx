import { WorkspaceAuthAction } from '@mandor/env';
import { WorkspaceListAction, WorkspacePanelAction } from '@mandor/workspace';

import { HANDSHAKE_SCHEMES } from '../features/connections/index.js';

import { AsyncWorkspaceExportAction } from './AsyncWorkspaceExportAction.js';
import { AsyncWorkspaceImportAction } from './AsyncWorkspaceImportAction.js';

/**
 * What Mandor Realtime adds beside the form of the workspaces page, written out: the
 * import that makes a workspace, and the export of the one that is open. The API key
 * travels in a header, the query or the subprotocol of the handshake, and only the
 * schemes the handshake applies are offered.
 */
export function AsyncPanelActions() {
    return (
        <>
            <WorkspacePanelAction id="auth">
                <WorkspaceAuthAction
                    placements={['header', 'query', 'subprotocol']}
                    schemes={HANDSHAKE_SCHEMES}
                />
            </WorkspacePanelAction>
            <WorkspacePanelAction id="export">
                <AsyncWorkspaceExportAction />
            </WorkspacePanelAction>
            <WorkspaceListAction id="import">
                <AsyncWorkspaceImportAction />
            </WorkspaceListAction>
        </>
    );
}
