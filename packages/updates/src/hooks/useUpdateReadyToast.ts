import { useMessages } from '@mandor/i18n';
import type { UpdateState } from '@mandor/ipc';
import { useToast } from '@mandor/ui';
import { useEffect } from 'react';
import { useStore } from 'zustand';

import { installUpdate } from '../lib/update-actions.js';
import { updateStore } from '../update-store.js';

/** The version ready to install, while there is one. */
function readyVersion(state: UpdateState | undefined): string | undefined {
    if (state?.phase !== 'ready') {
        return undefined;
    }

    return state.next?.version;
}

/**
 * Tells the person, once per version, that a version is ready to install. The store remembers
 * which one it told, so main repeating the state or the window drawing again says nothing more.
 */
export function useUpdateReadyToast(): void {
    const messages = useMessages('updates');
    const toast = useToast();
    const state = useStore(updateStore, (current) => current.state);
    const version = readyVersion(state);

    useEffect(() => {
        if (version === undefined || !updateStore.getState().announce(version)) {
            return;
        }

        toast.notify({
            action: { label: messages('toastRestart'), onSelect: installUpdate },
            detail: messages('toastReadyDetail', { version }),
            key: 'update-ready',
            title: messages('toastReadyTitle'),
            tone: 'info',
        });
    }, [messages, toast, version]);
}
