import { useMessages } from '@mandor/i18n';
import { ArrowInboundIcon, ArrowOutboundIcon } from '@mandor/icons';
import type { HttpResponse } from '@mandor/schema';

import { FactHeading } from './FactHeading.js';
import { FactRows } from './FactRows.js';
import { formatBytes, responseBytesOf } from './lib/format-response.js';

type ResponseSizeDetailProps = {
    sizes: HttpResponse['sizes'];
};

type Row = readonly [string, string | undefined];

/**
 * What each direction weighed: the answer, head and body as they came over the wire, and the
 * request that asked for it. A stored send from before heads were counted has its body alone.
 */
export function ResponseSizeDetail({ sizes }: ResponseSizeDetailProps) {
    const labels = useMessages('requests');
    const { bodyBytes, headerBytes, transferredBytes } = sizes;
    const answer: Row[] = [
        [labels('sizeHeaders'), headerBytes === undefined ? undefined : formatBytes(headerBytes)],
        [labels('sizeBody'), formatBytes(transferredBytes)],
        [
            labels('sizeDecoded'),
            bodyBytes === transferredBytes ? undefined : formatBytes(bodyBytes),
        ],
    ];

    return (
        <div className="flex flex-col gap-gap-control" data-part="response-size-detail">
            <FactHeading label={labels('responseSize')} value={formatBytes(responseBytesOf(sizes))}>
                <ArrowInboundIcon className="text-text-success" />
            </FactHeading>
            <FactRows rows={answer} />
            <RequestSizes sizes={sizes} />
        </div>
    );
}

function RequestSizes({ sizes }: ResponseSizeDetailProps) {
    const labels = useMessages('requests');
    const { requestBodyBytes, requestHeaderBytes } = sizes;

    if (requestHeaderBytes === undefined || requestBodyBytes === undefined) {
        return null;
    }

    return (
        <>
            <FactHeading
                label={labels('requestSize')}
                value={formatBytes(requestHeaderBytes + requestBodyBytes)}
            >
                <ArrowOutboundIcon className="text-text-info" />
            </FactHeading>
            <FactRows
                rows={[
                    [labels('sizeHeaders'), formatBytes(requestHeaderBytes)],
                    [labels('sizeBody'), formatBytes(requestBodyBytes)],
                ]}
            />
        </>
    );
}
