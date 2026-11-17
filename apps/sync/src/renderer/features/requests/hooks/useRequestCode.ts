import { useMessages } from '@mandor/i18n';
import type { SnippetTarget } from '@mandor/schema';
import { fireAndForget } from '@mandor/shell';
import { useToast } from '@mandor/ui';
import { useState } from 'react';

import { useRequestSnippet, type SnippetState } from './useRequestSnippet.js';

/** The dialog of the code is view state: the language it opens on is always cURL. */
type CodeDialog = { open: boolean; target: SnippetTarget };

export type RequestCode = {
    onCopy: () => void;
    onOpenChange: (open: boolean) => void;
    onTargetChange: (target: SnippetTarget) => void;
    open: boolean;
    snippet: SnippetState | null;
    target: SnippetTarget;
};

/**
 * Everything the code of a request needs to be shown: whether the dialog is open, the language
 * it is in, the code asked of main for both and a copy that says whether it reached the
 * clipboard. `show` is what opens it.
 */
export function useRequestCode(resource: string): { dialog: RequestCode; show: () => void } {
    const labels = useMessages('requests');
    const toast = useToast();
    const [state, setState] = useState<CodeDialog>({ open: false, target: 'curl' });
    const snippet = useRequestSnippet({ open: state.open, resource, target: state.target });

    return {
        dialog: {
            onCopy: () => {
                if (snippet?.state !== 'ready') {
                    return;
                }

                fireAndForget(
                    navigator.clipboard.writeText(snippet.code).then(
                        () => {
                            toast.notify({ title: labels('codeCopied'), tone: 'success' });
                        },
                        () => {
                            toast.notify({ title: labels('codeCopyFailed'), tone: 'error' });
                        },
                    ),
                );
            },
            onOpenChange: (open) => {
                setState((current) => ({ ...current, open }));
            },
            onTargetChange: (target) => {
                setState((current) => ({ ...current, target }));
            },
            open: state.open,
            snippet,
            target: state.target,
        },
        show: () => {
            setState((current) => ({ ...current, open: true }));
        },
    };
}
