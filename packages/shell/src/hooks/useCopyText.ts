import { useMessages } from '@mandor/i18n';
import { useToast } from '@mandor/ui';

import { fireAndForget } from '../fire-and-forget.js';
import { useFailureToast } from './useFailureToast.js';

/** Puts a text on the clipboard and says so, or says why not: a copy nobody saw is not a copy. */
export function useCopyText(): (text: string) => void {
    const notifyFailure = useFailureToast();
    const labels = useMessages('shell');
    const toast = useToast();

    return (text) => {
        fireAndForget(
            navigator.clipboard.writeText(text).then(
                () => {
                    toast.notify({ title: labels('copied'), tone: 'success' });
                },
                () => {
                    notifyFailure('unknown');
                },
            ),
        );
    };
}
