import { useEditorIssueMessage, useMessages } from '@mandor/i18n';
import { useMemo, type ReactNode } from 'react';

import type { ConnectionMessageEntry } from '../../activity-entry.js';
import { inboundVerdictOf } from '../../inbound-verdict.js';
import { frameFormat } from '../../lib/frame-payload.js';
import { FramePayloadView } from './FramePayloadView.js';

type ConnectionMessageDetailProps = {
    entry: ConnectionMessageEntry;
};

/**
 * The chosen frame read whole: the payload in the shape it arrived in — laid out if it parses as
 * JSON, in hex if it never was text — because what the connection announced it would send is a
 * promise, and this is the evidence. What the row said about it — direction, moment, weight —
 * the band over the dock already says. An inbound frame that broke the schema of the item it
 * pairs with lists here the fields that broke it, with the route and the reason.
 */
export function ConnectionMessageDetail({ entry }: ConnectionMessageDetailProps): ReactNode {
    const record = entry.detail;
    // The dock draws again with every frame that crosses; reading a large one each time froze it.
    const format = useMemo(
        () => frameFormat({ binary: record.binary, data: record.data }),
        [record.binary, record.data],
    );
    // The row judged the frame when it was painted; the dock reads the same verdict.
    const verdict = inboundVerdictOf(entry);

    return (
        <div
            className="flex h-full min-h-0 min-w-0 flex-col"
            data-format={format}
            data-part="activity-detail"
        >
            <SchemaVerdict verdict={verdict} />
            <FramePayloadView entryId={entry.id} format={format} frame={record} />
        </div>
    );
}

function SchemaVerdict({ verdict }: { verdict: ReturnType<typeof inboundVerdictOf> }) {
    const messages = useMessages('connections');
    const say = useEditorIssueMessage();

    if (verdict === undefined || verdict.length === 0) {
        return null;
    }

    return (
        <div
            className="flex h-row shrink-0 items-center gap-gap-control px-pad-panel"
            data-part="activity-detail-schema"
        >
            <span className="font-semibold text-text-warning">{messages('schemaUnmetTitle')}</span>
            <span className="truncate text-text-secondary">
                {verdict
                    .map((issue) => `${issue.path || '/'} ${say(issue.message, issue)}`)
                    .join(', ')}
            </span>
        </div>
    );
}
