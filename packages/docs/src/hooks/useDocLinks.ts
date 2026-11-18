import { useMessages } from '@mandor/i18n';
import { fireAndForget } from '@mandor/shell';
import { useToast } from '@mandor/ui';
import { useCallback } from 'react';

import type { DocOpen } from './useDocOpen.js';
import { openDocTitled, titleOfLink } from '../lib/doc-title-link.js';
import { openResourceLink, type LinkRefusal } from '../lib/open-resource-link.js';

function follow(uri: string, aside: boolean): Promise<LinkRefusal | null> {
    const title = titleOfLink(uri);

    return title === null ? openResourceLink(uri, aside) : openDocTitled(title, aside);
}

/**
 * What the doc being read does with a link of the workbench. A refusal is told where the reader
 * is looking, with the URI under it: taking a link is something they asked for, and the line of
 * the doc that went stale is the one thing the message can hand back to whoever wrote it.
 */
export function useDocLinks(): DocOpen {
    const messages = useMessages('docs');
    const toast = useToast();

    return useCallback(
        (uri, aside) => {
            fireAndForget(
                follow(uri, aside).then((refusal) => {
                    if (refusal !== null) {
                        toast.notify({ detail: uri, title: messages(refusal), tone: 'warning' });
                    }
                }),
            );
        },
        [messages, toast],
    );
}
