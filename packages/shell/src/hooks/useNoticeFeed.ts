import { useMessages } from '@mandor/i18n';
import { useToast } from '@mandor/ui';
import { useEffect, useRef } from 'react';

import { listenNotices } from '../notice/notice-feed.js';

/**
 * Shows each notice main raises as a toast in the language of the window, the ones that were
 * raised before it mounted included. Mounted once by each app, inside its toast provider; the
 * provider keeps the errors and warnings in the notice centre.
 */
export function useNoticeFeed(): void {
    const messages = useMessages('notices');
    const toast = useToast();
    const told = useRef(new Set<number>());

    useEffect(
        () =>
            listenNotices(
                (code, params) => messages(code, params),
                (request) => {
                    toast.notify(request);
                },
                told.current,
            ),
        [messages, toast],
    );
}
