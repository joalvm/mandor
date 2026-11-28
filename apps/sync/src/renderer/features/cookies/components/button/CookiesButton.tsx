import { envStore } from '@mandor/env';
import { useMessages } from '@mandor/i18n';
import { useShellStore } from '@mandor/shell';
import { Button } from '@mandor/ui';
import { useState } from 'react';
import { useStore } from 'zustand';

import { CookieJarDialog } from '../dialog/CookieJarDialog.js';

/**
 * Opens the jar of the environment the workspace has active. It stands at the end of the sections
 * of a request, where a send reads and writes the cookies; the jar is still the environment's. The dialog is mounted only while it
 * is open, so each opening reads the jar from main and nothing stale is shown.
 */
export function CookiesButton() {
    const labels = useMessages('cookies');
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);
    // Only the id is read: the list of environments is the picker's to load, not this button's.
    const environmentId = useStore(envStore, (state) =>
        workspaceId === null ? null : (state.activeEnvironmentIds[workspaceId] ?? null),
    );
    const [open, setOpen] = useState(false);

    return (
        <div className="ms-auto flex items-center" data-part="cookies-button">
            <Button
                disabled={workspaceId === null}
                onClick={() => {
                    setOpen(true);
                }}
                size="sm"
                variant="ghost"
            >
                {labels('button')}
            </Button>
            <JarDialog
                environmentId={environmentId}
                onClose={() => {
                    setOpen(false);
                }}
                open={open}
                workspaceId={workspaceId}
            />
        </div>
    );
}

function JarDialog({
    environmentId,
    onClose,
    open,
    workspaceId,
}: {
    environmentId: string | null;
    onClose: () => void;
    open: boolean;
    workspaceId: string | null;
}) {
    if (!open || workspaceId === null) {
        return null;
    }

    return (
        <CookieJarDialog
            environmentId={environmentId}
            onClose={onClose}
            workspaceId={workspaceId}
        />
    );
}
