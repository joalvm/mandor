import { useLanguage, useMessages } from '@mandor/i18n';
import type { ListedWorkspace } from '@mandor/ipc';
import { WorkspaceIcon } from '@mandor/icons';
import { InlineNameInput, TableRowActions } from '@mandor/ui';

import { formatModified } from '../../lib/format-modified.js';
import { WorkspaceRowMenu } from '../menu/WorkspaceRowMenu.js';

type WorkspaceRowProps = {
    workspace: ListedWorkspace;
    active: boolean;
    renaming: boolean;
    onRenameRequest: () => void;
    /** Answers whether the name was worth asking main about; the input keeps the row otherwise. */
    onRenameCommit: (name: string) => boolean;
    onRenameCancel: () => void;
    onDelete: () => void;
};

/**
 * One workspace of the table. The row is reading; the way in is the workspace selector of the
 * window, and the only writing it does is the rename, in place, the way the collection renames.
 */
export function WorkspaceRow({
    workspace,
    active,
    renaming,
    onRenameRequest,
    onRenameCommit,
    onRenameCancel,
    onDelete,
}: WorkspaceRowProps) {
    const language = useLanguage();

    return (
        <tr data-active={active} data-part="workspace-row">
            <td>
                <WorkspaceName
                    onRenameCancel={onRenameCancel}
                    onRenameCommit={onRenameCommit}
                    renaming={renaming}
                    workspace={workspace}
                />
            </td>
            <td className="tabular-nums text-text-secondary">
                {formatModified(workspace.modifiedAt, language)}
            </td>
            <TableRowActions reveal="always">
                <WorkspaceRowMenu onDelete={onDelete} onRename={onRenameRequest} />
            </TableRowActions>
        </tr>
    );
}

function WorkspaceName({
    onRenameCancel,
    onRenameCommit,
    renaming,
    workspace,
}: Pick<WorkspaceRowProps, 'onRenameCancel' | 'onRenameCommit' | 'renaming' | 'workspace'>) {
    const messages = useMessages('workspace');

    if (renaming) {
        return (
            <InlineNameInput
                label={messages('nameLabel')}
                onCancel={onRenameCancel}
                onCommit={onRenameCommit}
                value={workspace.name}
            />
        );
    }

    return (
        <span className="flex min-w-0 items-center gap-gap-icon-text">
            <WorkspaceIcon />
            <span className="min-w-0 truncate">{workspace.name}</span>
        </span>
    );
}
