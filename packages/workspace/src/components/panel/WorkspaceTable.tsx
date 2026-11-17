import { useMessages } from '@mandor/i18n';
import type { ListedWorkspace } from '@mandor/ipc';
import { Table, TableHead, TableHeaderCell, TableTools, type TableColumn } from '@mandor/ui';

import { WorkspaceRow } from './WorkspaceRow.js';

type WorkspaceTableProps = {
    workspaces: readonly ListedWorkspace[];
    activeWorkspaceId: string | null;
    renamingId: string | null;
    onRenameRequest: (workspace: ListedWorkspace) => void;
    onRenameCommit: (workspace: ListedWorkspace, name: string) => boolean;
    onRenameCancel: () => void;
    onDelete: (workspace: ListedWorkspace) => void;
};

const COLUMNS: readonly TableColumn[] = [
    { id: 'name', kind: 'fluid', min: 'md', weight: 2 },
    { id: 'modified', kind: 'fluid', min: 'md', weight: 1 },
];

/**
 * The workspaces as a table: what identifies them, when each was last touched, and what can
 * be done to each, on the table every list of rows in the window shares.
 */
export function WorkspaceTable({
    workspaces,
    activeWorkspaceId,
    renamingId,
    onRenameRequest,
    onRenameCommit,
    onRenameCancel,
    onDelete,
}: WorkspaceTableProps) {
    const messages = useMessages('workspace');

    return (
        <Table columns={COLUMNS} label={messages('heading')}>
            <TableHead>
                <TableHeaderCell column="name">{messages('columnName')}</TableHeaderCell>
                <TableHeaderCell column="modified">{messages('columnModified')}</TableHeaderCell>
                <TableTools label={messages('columnActions')} />
            </TableHead>
            <tbody data-part="workspace-table">
                {workspaces.map((workspace) => (
                    <WorkspaceRow
                        active={workspace.id === activeWorkspaceId}
                        key={workspace.id}
                        onDelete={() => {
                            onDelete(workspace);
                        }}
                        onRenameCancel={onRenameCancel}
                        onRenameCommit={(name) => {
                            return onRenameCommit(workspace, name);
                        }}
                        onRenameRequest={() => {
                            onRenameRequest(workspace);
                        }}
                        renaming={workspace.id === renamingId}
                        workspace={workspace}
                    />
                ))}
            </tbody>
        </Table>
    );
}
