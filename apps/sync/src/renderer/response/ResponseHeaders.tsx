import { useMessages } from '@mandor/i18n';
import type { HttpResponse } from '@mandor/schema';
import { useCopyText } from '@mandor/shell';

import { ResponseTable } from './ResponseTable.js';

type ResponseHeadersProps = {
    headers: HttpResponse['headers'];
};

/** The headers the server sent, as it sent them. Copying one line or all of them is one click. */
export function ResponseHeaders({ headers }: ResponseHeadersProps) {
    const labels = useMessages('requests');
    const copy = useCopyText();
    const rows = headers.map(([name, value]) => ({ copy: `${name}: ${value}`, name, value }));

    return (
        <div
            className="flex h-full min-h-0 min-w-0 flex-col px-pad-panel py-pad-control"
            data-part="response-headers"
        >
            <ResponseTable label={labels('headers')} onCopy={copy} rows={rows} />
        </div>
    );
}
