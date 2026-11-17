import { useMessages } from '@mandor/i18n';
import type { ErrorCode, ListedWorkspace } from '@mandor/ipc';
import { bridge, fireAndForget, useFailureToast, useShellStore } from '@mandor/shell';
import { Button, EmptyState } from '@mandor/ui';
import { useState, type ComponentProps } from 'react';
import { useStore } from 'zustand';

import { leaveWorkspace } from '../../leave-workspace.js';
import { selectWorkspaces } from '../../selectors.js';
import { workspacesStore } from '../../workspaces-store.js';
import { NewWorkspaceDialog } from '../dialog/NewWorkspaceDialog.js';
import { WorkspaceDeleteDialog } from '../dialog/WorkspaceDeleteDialog.js';
import { WorkspaceActions } from './WorkspaceActions.js';
import { WorkspaceTable } from './WorkspaceTable.js';

/**
 * The workspaces of the active origin as a page: a title that says what it is, the actions under
 * it, and the table below — all inside the reading width of the app, because this is a page of
 * the window and not the window itself.
 */
export function WorkspacePanel() {
    const messages = useMessages('workspace');
    const notifyFailure = useFailureToast();
    const workspaces = useStore(workspacesStore, selectWorkspaces);
    const activeOriginId = useShellStore((state) => state.activeOriginId);
    const activeWorkspaceId = useShellStore((state) => state.activeWorkspaceId);
    const setActiveWorkspace = useShellStore((state) => state.setActiveWorkspace);
    const [creating, setCreating] = useState(false);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<ListedWorkspace | null>(null);
    // Between letting go of one origin and adopting the next there is none, and the
    // workspaces of the one being replaced are not this window's to offer.
    const listed = activeOriginId === null ? [] : workspaces;

    const reportFailure = (code: ErrorCode): void => {
        notifyFailure(code);
    };

    const rename = (workspace: ListedWorkspace, name: string): boolean => {
        const trimmed = name.trim();

        if (trimmed === '') {
            return false;
        }

        setRenamingId(null);

        if (trimmed !== workspace.name) {
            fireAndForget(
                bridge.workspace.rename({ id: workspace.id, name: trimmed }).then((result) => {
                    if (result.ok) {
                        workspacesStore
                            .getState()
                            .upsertWorkspace({ ...result.value, modifiedAt: workspace.modifiedAt });
                    } else {
                        reportFailure(result.error.code);
                    }
                }),
            );
        }

        return true;
    };

    const remove = (workspace: ListedWorkspace): void => {
        setDeleting(null);
        fireAndForget(
            bridge.workspace.delete({ id: workspace.id }).then((result) => {
                if (result.ok) {
                    const kept = workspacesStore
                        .getState()
                        .workspaces.filter((each) => each.id !== workspace.id);

                    workspacesStore.getState().setWorkspaces(kept);
                    leaveWorkspace(workspace.id, kept);
                } else {
                    reportFailure(result.error.code);
                }
            }),
        );
    };

    return (
        <section
            aria-labelledby="workspaces-heading"
            className="flex h-full min-h-0 min-w-0 flex-col"
            data-part="workspace-panel"
        >
            <div
                className="mx-auto flex h-full w-full max-w-2xl flex-col gap-gap-section overflow-y-auto p-pad-panel pt-gap-section"
                data-part="workspace-list"
            >
                <header className="flex flex-col gap-gap-control">
                    <h1 className="text-lg font-semibold text-text-primary" id="workspaces-heading">
                        {messages('heading')}
                    </h1>
                    <p className="text-sm text-text-secondary">{messages('subtitle')}</p>
                </header>
                <WorkspaceActions
                    canCreate={activeOriginId !== null}
                    onNew={() => {
                        setCreating(true);
                    }}
                />
                <WorkspaceList
                    activeOriginId={activeOriginId}
                    activeWorkspaceId={activeWorkspaceId}
                    onCreate={() => {
                        setCreating(true);
                    }}
                    onDelete={setDeleting}
                    onRenameCancel={() => {
                        setRenamingId(null);
                    }}
                    onRenameCommit={rename}
                    onRenameRequest={(workspace) => {
                        setRenamingId(workspace.id);
                    }}
                    renamingId={renamingId}
                    workspaces={listed}
                />
            </div>
            <CreatingDialog
                creating={creating}
                onClose={() => {
                    setCreating(false);
                }}
                onCreated={(fresh) => {
                    setCreating(false);
                    workspacesStore.getState().upsertWorkspace({
                        ...fresh,
                        modifiedAt: new Date().toISOString(),
                    });
                    setActiveWorkspace(fresh.id);
                }}
            />
            <WorkspaceDeleteDialog
                onCancel={() => {
                    setDeleting(null);
                }}
                onConfirm={remove}
                workspace={deleting}
            />
        </section>
    );
}

type WorkspaceListProps = ComponentProps<typeof WorkspaceTable> & {
    activeOriginId: string | null;
    onCreate: () => void;
};

function WorkspaceList({ activeOriginId, onCreate, workspaces, ...table }: WorkspaceListProps) {
    const messages = useMessages('workspace');

    if (workspaces.length === 0) {
        return (
            <EmptyState
                description={messages('emptyBody')}
                icon="workspace"
                title={messages('emptyTitle')}
            >
                <Button disabled={activeOriginId === null} onClick={onCreate} variant="primary">
                    {messages('newWorkspace')}
                </Button>
            </EmptyState>
        );
    }

    return <WorkspaceTable {...table} workspaces={workspaces} />;
}

type CreatingDialogProps = ComponentProps<typeof NewWorkspaceDialog> & { creating: boolean };

function CreatingDialog({ creating, onClose, onCreated }: CreatingDialogProps) {
    if (!creating) {
        return null;
    }

    return <NewWorkspaceDialog onClose={onClose} onCreated={onCreated} />;
}
