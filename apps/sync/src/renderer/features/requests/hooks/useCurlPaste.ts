import { useMessages } from '@mandor/i18n';
import { useToast } from '@mandor/ui';
import { useCallback } from 'react';

import { applyCurl } from '../lib/apply-curl.js';
import { looksLikeCurl } from '../lib/looks-like-curl.js';
import { editRequest } from '../lib/pending-request-write.js';
import { requestsStore } from '../requests-store.js';
import { useCurlReader } from './useCurlReader.js';

/**
 * Takes a curl command pasted into the url and fills the request with it. Anything else is left
 * to the field. The toast tells what the command said that the request could not keep, and its
 * action gives back the request as it was.
 */
export function useCurlPaste(resource: string): (text: string) => boolean {
    const labels = useMessages('requests');
    const { notify } = useToast();
    const { noticesOf, read } = useCurlReader();

    return useCallback(
        (text) => {
            if (!looksLikeCurl(text)) {
                return false;
            }

            read(text, (parse) => {
                const previous = requestsStore.getState().requests[resource];

                if (previous === undefined) {
                    return;
                }

                editRequest(resource, applyCurl(previous, parse.request));
                notify({
                    action: {
                        label: labels('curlUndo'),
                        onSelect: () => {
                            editRequest(resource, previous);
                        },
                    },
                    detail: noticesOf(parse),
                    title: labels('curlApplied'),
                    tone: parse.notices.length === 0 ? 'success' : 'warning',
                });
            });

            return true;
        },
        [labels, noticesOf, notify, read, resource],
    );
}
