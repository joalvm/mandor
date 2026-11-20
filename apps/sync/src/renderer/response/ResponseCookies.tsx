import { useMessages } from '@mandor/i18n';
import type { HttpResponse } from '@mandor/schema';
import { useCopyText } from '@mandor/shell';
import { EmptyState } from '@mandor/ui';

import { cookieAttributesOf } from './lib/cookie-attributes.js';
import { ResponseTable } from './ResponseTable.js';

type ResponseCookiesProps = {
    cookies: HttpResponse['cookies'];
};

/** The cookies this response set, with the attributes their line carried. Nothing is stored. */
export function ResponseCookies({ cookies }: ResponseCookiesProps) {
    const labels = useMessages('requests');
    const copy = useCopyText();

    if (cookies.length === 0) {
        return (
            <EmptyState
                description={labels('cookiesEmpty')}
                icon="info"
                title={labels('cookiesEmptyTitle')}
            />
        );
    }

    const rows = cookies.map((cookie) => ({
        attributes: cookieAttributesOf(cookie).join('; '),
        copy: `${cookie.name}=${cookie.value}`,
        name: cookie.name,
        value: cookie.value,
    }));

    return (
        <div
            className="flex h-full min-h-0 min-w-0 flex-col px-pad-panel py-pad-control"
            data-part="response-cookies"
        >
            <ResponseTable label={labels('cookies')} onCopy={copy} rows={rows} showAttributes />
        </div>
    );
}
