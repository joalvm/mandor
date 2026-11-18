import { AddIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import { useDeclaredList } from '@mandor/shell';
import { Button } from '@mandor/ui';
import { Fragment } from 'react';

import { workspaceListActionDeclarations } from '../../list-actions.js';
import { workspacePanelActionDeclarations } from '../../panel-actions.js';

type WorkspaceActionsProps = {
    /** Without an origin there is nowhere to write, so the way in waits for one. */
    canCreate: boolean;
    onNew: () => void;
};

/**
 * The actions of the workspaces page, under its title: the way a workspace is born, what the app
 * declared that also makes one, and what it declared for the workspace that is open —importing and
 * exporting are the app's, not the panel's.
 */
export function WorkspaceActions({ canCreate, onNew }: WorkspaceActionsProps) {
    const messages = useMessages('workspace');
    const makers = useDeclaredList(workspaceListActionDeclarations);
    const actions = useDeclaredList(workspacePanelActionDeclarations);

    return (
        <div className="flex items-center gap-gap-control" data-part="workspace-actions">
            <Button
                className="gap-gap-control"
                disabled={!canCreate}
                onClick={onNew}
                size="sm"
                variant="secondary"
            >
                <AddIcon size="sm" />
                {messages('newWorkspace')}
            </Button>
            {makers.map((action) => (
                <Fragment key={action.id}>{action.content}</Fragment>
            ))}
            {actions.map((action) => (
                <Fragment key={action.id}>{action.content}</Fragment>
            ))}
        </div>
    );
}
