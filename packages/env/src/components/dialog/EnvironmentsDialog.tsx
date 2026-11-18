import { useMessages } from '@mandor/i18n';
import type { Environment } from '@mandor/schema';
import { fireAndForget } from '@mandor/shell';
import { ConfirmDialog, Dialog, DialogBody, DialogNav, EmptyState } from '@mandor/ui';
import { useState } from 'react';
import { useStore } from 'zustand';

import { envStore } from '../../env-store.js';
import { GLOBALS_ROW } from '../../lib/globals-row.js';
import { scheduleRowWrite } from '../../lib/environment-row-write.js';
import { EnvironmentDetail } from './EnvironmentDetail.js';
import { EnvironmentList } from './EnvironmentList.js';

type EnvironmentsDialogProps = {
    environmentId: string | null;
    onOpenChange: (open: boolean) => void;
    open: boolean;
    workspaceId: string;
};

/**
 * Creates and edits the environments of a workspace as master and detail. Which one is on screen
 * is where the cursor stands, not a fact of the workspace, so it lives here and never reaches the
 * store: closing the dialog is allowed to forget it. The door out of an environment is the cross
 * of its own row in the column, and it asks once before it takes it.
 */
export function EnvironmentsDialog({
    environmentId,
    onOpenChange,
    open,
    workspaceId,
}: EnvironmentsDialogProps) {
    const messages = useMessages('environment');
    const environments = useStore(envStore, (state) => state.environments);
    const globals = useStore(envStore, (state) => state.globals);
    const defaultId = useStore(
        envStore,
        (state) => state.defaultEnvironmentIds[workspaceId] ?? null,
    );
    const [chosenId, setChosenId] = useState<string | null>(environmentId);
    const [draft, setDraft] = useState<Environment | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    // The globals read as one more environment here: a list of variables, secrets included.
    const globalsRow = { id: GLOBALS_ROW, name: messages('globals'), variables: globals };
    // None asked for, or one another window already deleted: the list still has one open.
    const stored =
        chosenId === GLOBALS_ROW
            ? globalsRow
            : (environments.find((environment) => environment.id === chosenId) ?? environments[0]);
    const selectedId = stored?.id ?? null;
    const shown = draft !== null && draft.id === selectedId ? draft : stored;

    const change = (next: Environment): void => {
        setDraft(next);
        scheduleRowWrite(workspaceId, next);
    };

    const create = (): void => {
        fireAndForget(envStore.getState().create(workspaceId, messages('defaultName')));
    };

    const removing = environments.find((environment) => environment.id === removingId);

    const remove = (): void => {
        const environmentId = removingId;

        setRemovingId(null);

        if (environmentId === null) {
            return;
        }

        if (environmentId === selectedId) {
            setChosenId(null);
            setDraft(null);
        }

        fireAndForget(envStore.getState().remove(workspaceId, environmentId));
    };

    return (
        <div data-part="environments-dialog">
            {/* modal-policy: short-config-form */}
            <Dialog
                closeLabel={messages('close')}
                onOpenChange={onOpenChange}
                open={open}
                title={messages('title')}
            >
                <DialogNav>
                    <EnvironmentList
                        defaultId={defaultId}
                        environments={environments}
                        onCreate={create}
                        onMakeDefault={(id) => {
                            fireAndForget(
                                envStore
                                    .getState()
                                    .setDefault(workspaceId, id === defaultId ? null : id),
                            );
                        }}
                        onRemove={setRemovingId}
                        onSelect={(environmentId) => {
                            setChosenId(environmentId);
                            setDraft(null);
                        }}
                        selectedId={selectedId}
                    />
                </DialogNav>
                <DialogBody>
                    <EnvironmentBody onChange={change} shown={shown} />
                </DialogBody>
            </Dialog>
            {/* modal-policy: irreversible-confirmation */}
            <ConfirmDialog
                cancelLabel={messages('deleteCancel')}
                confirmLabel={messages('deleteConfirm')}
                description={messages('deleteBody', { name: removing?.name ?? '' })}
                onCancel={() => {
                    setRemovingId(null);
                }}
                onConfirm={remove}
                onOpenChange={(openDialog) => {
                    if (!openDialog) {
                        setRemovingId(null);
                    }
                }}
                open={removingId !== null}
                title={messages('deleteTitle')}
            />
        </div>
    );
}

function EnvironmentBody({
    onChange,
    shown,
}: {
    onChange: (next: Environment) => void;
    shown: Environment | undefined;
}) {
    const messages = useMessages('environment');

    if (shown === undefined) {
        return (
            <EmptyState
                description={messages('empty')}
                icon="environment"
                title={messages('none')}
            />
        );
    }

    // Each environment is a table of its own: the ids of its lines and the
    // values one revealed do not cross into the next one.
    return (
        <EnvironmentDetail
            environment={shown}
            key={shown.id}
            onChange={onChange}
            renamable={shown.id !== GLOBALS_ROW}
        />
    );
}
