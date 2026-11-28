import type { HttpResponse } from '@mandor/schema';
import { useLanguage, useMessages } from '@mandor/i18n';
import { Badge } from '@mandor/ui';
import type { PropsWithChildren } from 'react';

import { formatBytes, formatDuration, responseBytesOf } from './lib/format-response.js';
import { ResponseFact } from './ResponseFact.js';
import { ResponseNetworkDetail } from './ResponseNetworkDetail.js';
import { ResponseSizeDetail } from './ResponseSizeDetail.js';
import { ResponseStatus } from './ResponseStatus.js';
import { ResponseTimeDetail } from './ResponseTimeDetail.js';

type ResponseSummaryProps = PropsWithChildren<{
    response: HttpResponse;
}>;

function Separator() {
    return (
        <span aria-hidden="true" className="text-text-disabled">
            ·
        </span>
    );
}

/**
 * What an answer says first: its status as a pill, the time it took, what it weighed and the
 * connection it came over. Each figure opens what it adds up to when the pointer rests on it.
 * It stands at the far end of the strip of the sections, on the same row, so the first thing
 * read after a send does not cost a row of its own. What the caller puts inside it sits after
 * the facts: the reader of a stored answer and the reader of the last send each add their own.
 */
export function ResponseSummary({ children, response }: ResponseSummaryProps) {
    const labels = useMessages('requests');
    const language = useLanguage();
    const { graphqlErrors, sizes, timings } = response;

    return (
        <div
            className="ml-auto flex min-w-0 items-center gap-gap-tight overflow-hidden text-sm"
            data-fault={graphqlErrors !== undefined}
            data-part="response-summary"
            data-state="done"
        >
            <ResponseStatus status={response.status} statusText={response.statusText} />
            <Separator />
            <ResponseFact
                label={labels('responseTime')}
                part="response-time"
                text={formatDuration(timings.totalMs, language)}
            >
                <ResponseTimeDetail timings={timings} />
            </ResponseFact>
            <Separator />
            <ResponseFact
                label={labels('responseSize')}
                part="response-size"
                text={formatBytes(responseBytesOf(sizes), language)}
            >
                <ResponseSizeDetail sizes={sizes} />
            </ResponseFact>
            <Separator />
            <ResponseFact label={labels('network')} part="response-network">
                <ResponseNetworkDetail response={response} />
            </ResponseFact>
            <GraphqlBadge errors={graphqlErrors} />
            <SummaryExtras>{children}</SummaryExtras>
        </div>
    );
}

function GraphqlBadge({ errors }: { errors: HttpResponse['graphqlErrors'] }) {
    const labels = useMessages('requests');

    if (errors === undefined) {
        return null;
    }

    return <Badge tone="error">{labels('graphqlErrorsBadge', { count: errors.count })}</Badge>;
}

function SummaryExtras({ children }: PropsWithChildren) {
    if (children === undefined) {
        return null;
    }

    return <div className="flex shrink-0 items-center gap-gap-tight">{children}</div>;
}
