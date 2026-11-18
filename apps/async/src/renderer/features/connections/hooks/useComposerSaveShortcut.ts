import type { ErrorCode } from '@mandor/ipc';
import { fireAndForget } from '@mandor/shell';
import type { KeyboardEvent } from 'react';

import { saveEventInComposer } from '../../../events/save-event-in-composer.js';

type ComposerSaveShortcutOptions = {
    connectionId: string;
    onError: (code: ErrorCode) => void;
};

/**
 * Ctrl+S anywhere on the connection panel puts the composer's payload back into the event it
 * came from. The composer composes a file of the collection, and the save is what puts the two
 * back together; a connection composing nothing has nothing to save and lets the key through.
 */
export function useComposerSaveShortcut({ connectionId, onError }: ComposerSaveShortcutOptions) {
    return (keyEvent: KeyboardEvent<HTMLDivElement>): void => {
        if (keyEvent.key.toLowerCase() !== 's' || (!keyEvent.ctrlKey && !keyEvent.metaKey)) {
            return;
        }

        keyEvent.preventDefault();
        fireAndForget(
            saveEventInComposer(connectionId).then((code: ErrorCode | null) => {
                if (code !== null) {
                    onError(code);
                }
            }),
        );
    };
}
