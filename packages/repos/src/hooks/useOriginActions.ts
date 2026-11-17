import type { ErrorCode } from '@mandor/ipc';
import type { Origin } from '@mandor/schema';
import { fireAndForget, shellStore, useFailureToast } from '@mandor/shell';
import { useState } from 'react';

import { emptyOrigin } from '../lib/empty-origin.js';
import { removeOrigin } from '../lib/remove-origin.js';
import { renameOrigin } from '../lib/rename-origin.js';

type OriginActionsOptions = {
    activeOriginId: string | null;
    /** Switching has an order only the app knows, so the actions ask the app to run it. */
    onSwitch: (id: string) => void;
    /** Called after anything that changes the list, so the panel reads it again. */
    refresh: () => void;
};

/**
 * Every question the origins tab can ask and every answer it can act on: adding, renaming in
 * place, emptying and removing. The dialogs live in the panel; what to do when they are
 * answered lives here. A failed channel speaks through the toast, never a live region.
 */
export function useOriginActions({ activeOriginId, onSwitch, refresh }: OriginActionsOptions) {
    const notifyFailure = useFailureToast();
    const [adding, setAdding] = useState(false);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [emptying, setEmptying] = useState<Origin | null>(null);
    const [removing, setRemoving] = useState<Origin | null>(null);

    const reportFailure = (code: ErrorCode): void => {
        notifyFailure(code);
    };

    const rename = (origin: Origin, name: string): boolean => {
        const trimmed = name.trim();

        if (trimmed === '') {
            return false;
        }

        setRenamingId(null);

        if (trimmed !== origin.name) {
            fireAndForget(
                renameOrigin({ id: origin.id, name: trimmed }).then((result) => {
                    if (result.ok) {
                        refresh();
                    } else {
                        reportFailure(result.error.code);
                    }
                }),
            );
        }

        return true;
    };

    const confirmEmpty = (origin: Origin): void => {
        setEmptying(null);
        fireAndForget(
            emptyOrigin(origin.id).then((result) => {
                if (result.ok) {
                    refresh();

                    if (origin.id === activeOriginId) {
                        fireAndForget(shellStore.getState().loadSession(origin.id));
                    }
                } else {
                    reportFailure(result.error.code);
                }
            }),
        );
    };

    const confirmRemove = (origin: Origin): void => {
        setRemoving(null);
        fireAndForget(
            removeOrigin(origin.id).then((result) => {
                if (result.ok) {
                    refresh();

                    if (origin.id === activeOriginId) {
                        onSwitch('local');
                    }
                } else {
                    reportFailure(result.error.code);
                }
            }),
        );
    };

    return {
        actions: {
            askEmpty: setEmptying,
            askRemove: setRemoving,
            cancelEmpty: () => {
                setEmptying(null);
            },
            cancelRemove: () => {
                setRemoving(null);
            },
            cancelRename: () => {
                setRenamingId(null);
            },
            closeAdd: () => {
                setAdding(false);
            },
            confirmEmpty,
            confirmRemove,
            openAdd: () => {
                setAdding(true);
            },
            rename,
            askRename: (origin: Origin) => {
                setRenamingId(origin.id);
            },
        },
        adding,
        emptying,
        removing,
        renamingId,
    };
}
