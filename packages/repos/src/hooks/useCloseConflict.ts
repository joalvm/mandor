import { useMessages } from '@mandor/i18n';
import type { Empty, Result } from '@mandor/ipc';
import {
    bridge,
    fireAndForget,
    selectGroupOfTab,
    shellStore,
    useFailureToast,
} from '@mandor/shell';
import { useToast } from '@mandor/ui';
import { useState } from 'react';

import type { ConflictChoices } from '../lib/conflict-drafts.js';

type CloseConflict = {
    /** A way out is in flight: both buttons wait for it. */
    busy: boolean;
    keepMine: () => void;
    resolve: () => void;
};

/**
 * The two ways out of a clash. Both ask main and both end the same way: a refusal speaks
 * through the toast and leaves the tab as it was, with what was chosen; a success says so and
 * closes the tab without asking, since nothing is left to lose — closing lets go of the draft.
 */
export function useCloseConflict(
    id: string,
    tabId: string,
    choices: ConflictChoices,
): CloseConflict {
    const messages = useMessages('conflicts');
    const notifyFailure = useFailureToast();
    const toast = useToast();
    const [busy, setBusy] = useState(false);

    const settle = (result: Result<Empty>): void => {
        setBusy(false);

        if (!result.ok) {
            notifyFailure(result.error.code);

            return;
        }

        toast.notify({ title: messages('resolved'), tone: 'success' });

        const groupId = selectGroupOfTab(shellStore.getState(), tabId);

        if (groupId !== null) {
            shellStore.getState().closeTab(groupId, tabId);
        }
    };

    const go = (call: Promise<Result<Empty>>): void => {
        setBusy(true);
        fireAndForget(call.then(settle));
    };

    return {
        busy,
        keepMine: () => {
            go(bridge.conflict.keepMine({ id }));
        },
        resolve: () => {
            go(bridge.conflict.resolve({ id, choices }));
        },
    };
}
