import { useImportDialog } from '@mandor/exchange';
import { useMessages } from '@mandor/i18n';
import { shellStore } from '@mandor/shell';
import { Button, Textarea, useToast } from '@mandor/ui';
import { useState } from 'react';

import { useCurlReader } from '../../hooks/useCurlReader.js';
import { applyCurl } from '../../lib/apply-curl.js';
import { looksLikeCurl } from '../../lib/looks-like-curl.js';
import { openLooseRequest } from '../../lib/open-loose-request.js';

/**
 * A curl command brought in by hand, in the import: it skips the document and opens as a request
 * saved nowhere yet, filled with what the command says, in the group in front. The import closes
 * once it is open; the toast says what the command said that the request could not keep.
 */
export function CurlImportField() {
    const labels = useMessages('requests');
    const { close } = useImportDialog();
    const { notify } = useToast();
    const { noticesOf, read } = useCurlReader();
    const [text, setText] = useState('');

    function open(): void {
        if (!looksLikeCurl(text)) {
            notify({ title: labels('curlInvalid.notCurl'), tone: 'warning' });

            return;
        }

        read(text, (parse) => {
            openLooseRequest(shellStore.getState().activeGroupId, labels('newRequest'), (blank) =>
                applyCurl(blank, parse.request),
            );
            notify({
                detail: noticesOf(parse),
                title: labels('curlApplied'),
                tone: parse.notices.length === 0 ? 'success' : 'warning',
            });
            close();
        });
    }

    return (
        <div className="flex flex-col gap-gap-control" data-part="curl-import">
            <span className="text-xs text-text-secondary">{labels('curlImportLabel')}</span>
            <Textarea
                label={labels('curlImportLabel')}
                mono
                onValueChange={setText}
                rows={3}
                value={text}
            />
            <div className="flex items-center justify-end" data-part="curl-import-actions">
                <Button onClick={open} variant="secondary">
                    {labels('curlImportOpen')}
                </Button>
            </div>
        </div>
    );
}
