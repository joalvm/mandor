import { useMessages } from '@mandor/i18n';
import type { ErrorCode } from '@mandor/ipc';
import { useToast } from '@mandor/ui';
import { useCallback } from 'react';

/**
 * Tells a failure the one way the window tells them: a toast in the words of its code. The code
 * picks the words; the message that came with it stays in the log. The same function while the
 * language and the window stay, so a callback can hold it in its dependencies.
 */
export function useFailureToast(): (code: ErrorCode) => void {
    const errors = useMessages('errors');
    const { notify } = useToast();

    return useCallback(
        (code: ErrorCode): void => {
            notify({ title: errors(code), tone: 'error' });
        },
        [errors, notify],
    );
}
