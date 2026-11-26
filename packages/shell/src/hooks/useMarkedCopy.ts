import { useEffect, useState } from 'react';

import { fireAndForget } from '../fire-and-forget.js';

/** How long a copy stays marked: long enough to be seen, not so long it is in the way. */
const COPIED_MS = 1500;

type MarkedCopy = {
    /** True for a moment after the text reached the clipboard. */
    copied: boolean;
    copy: (text: string) => void;
};

/**
 * Puts a text on the clipboard and marks the control that did it for a moment, in place of a
 * toast: a toast for a copy would be news of something the reader did a moment ago.
 */
export function useMarkedCopy(): MarkedCopy {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) {
            return undefined;
        }

        const timer = setTimeout(() => {
            setCopied(false);
        }, COPIED_MS);

        return () => {
            clearTimeout(timer);
        };
    }, [copied]);

    return {
        copied,
        copy: (text) => {
            fireAndForget(
                navigator.clipboard.writeText(text).then(() => {
                    setCopied(true);
                }),
            );
        },
    };
}
