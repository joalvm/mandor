import { useMessages } from '@mandor/i18n';
import type { ErrorCode } from '@mandor/ipc';
import type { ApiKeyPlacement, AuthConfig, ConcreteAuth, Environment } from '@mandor/schema';
import { useFailureToast, useShellStore } from '@mandor/shell';
import { Button, Dialog, DialogBody } from '@mandor/ui';
import { useStore } from 'zustand';
import { useState, type ReactNode } from 'react';

import { envStore } from '../../env-store.js';
import { useEnvironments } from '../../hooks/useEnvironments.js';
import { useWorkspaceAuth } from '../../hooks/useWorkspaceAuth.js';
import { AuthEditor } from './AuthEditor.js';

type WorkspaceAuthActionProps = {
    /** Where an API key may go in this app. The app that registers the action decides. */
    placements: readonly ApiKeyPlacement[];
    /** The schemes this app applies; every one when it names none. */
    schemes?: readonly ConcreteAuth['type'][] | undefined;
};

/**
 * The door of the workspace panel for the auth everything below inherits: one button, and the
 * editor opens on top of it. Both apps register it, each with the placements and schemes it applies.
 */
export function WorkspaceAuthAction({ placements, schemes }: WorkspaceAuthActionProps): ReactNode {
    const messages = useMessages('auth');
    const notifyFailure = useFailureToast();
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);
    const environments = useEnvironments();
    const activeEnvironmentId = useStore(envStore, (state) =>
        workspaceId === null ? undefined : state.activeEnvironmentIds[workspaceId],
    );
    const environment = environments.find((entry) => entry.id === activeEnvironmentId);
    const { auth, setAuth } = useWorkspaceAuth(workspaceId);
    const [open, setOpen] = useState(false);

    const fail = (code: ErrorCode): void => {
        notifyFailure(code);
    };

    return (
        <>
            <Button
                onClick={() => {
                    setOpen(true);
                }}
                variant="ghost"
            >
                {messages('action')}
            </Button>
            <AuthDialog
                auth={auth ?? undefined}
                environment={environment}
                environmentId={activeEnvironmentId ?? null}
                onChange={(next) => {
                    setAuth(next ?? null, fail);
                }}
                onOpenChange={setOpen}
                open={open}
                placements={placements}
                schemes={schemes}
            />
        </>
    );
}

type AuthDialogProps = WorkspaceAuthActionProps & {
    auth: AuthConfig | undefined;
    environment: Environment | undefined;
    environmentId: string | null;
    onChange: (auth: AuthConfig | undefined) => void;
    onOpenChange: (open: boolean) => void;
    open: boolean;
};

function AuthDialog({
    auth,
    environment,
    environmentId,
    onChange,
    onOpenChange,
    open,
    placements,
    schemes,
}: AuthDialogProps) {
    const messages = useMessages('auth');

    if (!open) {
        return null;
    }

    // The fields of the auth suggest variables of the active environment; they declare nothing
    // from here: the variables are edited where the environments are.
    const variablesChanged = (): void => undefined;

    return (
        // modal-policy: short-config-form
        <Dialog
            closeLabel={messages('close')}
            onOpenChange={onOpenChange}
            open={open}
            title={messages('title')}
        >
            <DialogBody>
                <AuthEditor
                    environment={environment}
                    environmentId={environmentId}
                    inheritable={false}
                    onChange={onChange}
                    onVariablesChange={variablesChanged}
                    parentPath={null}
                    placements={placements}
                    schemes={schemes}
                    value={auth}
                />
            </DialogBody>
        </Dialog>
    );
}
