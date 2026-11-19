import { registerSurface, TabBody, TabKind } from '@mandor/shell';
import { Card } from '@mandor/ui';
import { useEffect } from 'react';

import { WorkspacePanel } from './components/panel/WorkspacePanel.js';
import { openWorkspacesTab, WORKSPACES_TAB_KIND } from './open-workspaces-tab.js';

/** The management tab of the workspaces, and the surface the rest of the window reaches it by. */
export function WorkspacesTabKind() {
    useEffect(
        () =>
            registerSurface({
                id: WORKSPACES_TAB_KIND,
                open: () => {
                    openWorkspacesTab();
                },
            }),
        [],
    );

    return (
        <TabKind
            closable
            icon="workspace"
            id={WORKSPACES_TAB_KIND}
            title={(_resource, translate) => translate('workspace:heading')}
        >
            <TabBody>
                <Card>
                    <WorkspacePanel />
                </Card>
            </TabBody>
        </TabKind>
    );
}
