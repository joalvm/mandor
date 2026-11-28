import { useLanguage, useMessages } from '@mandor/i18n';
import { ArrowInboundIcon, ArrowOutboundIcon, WarningIcon } from '@mandor/icons';
import type { ActivityRecord } from '@mandor/ipc';
import { cn } from '@mandor/ui';
import { memo } from 'react';

import type { ConnectionMessageEntry } from '../../activity-entry.js';
import { useInboundVerdict } from '../../hooks/useInboundVerdict.js';
import type { VerdictIssue } from '../../inbound-verdict.js';
import { formatByteSize } from '../../lib/format-byte-size.js';
import { formatActivityTime } from '../../lib/format-activity-time.js';
import { UnansweredAckRow } from './UnansweredAckRow.js';
import { recordNameOf } from '../../lib/event-name.js';
import { messagePreview } from '../../lib/message-preview.js';

/**
 * The mark of a frame that did not meet the schema its item promised: the seal main stamped on
 * the frame that left, or the verdict the row computed for the one that arrived.
 */
function UnmetMark({
    inboundIssues,
    label,
    record,
}: {
    inboundIssues: VerdictIssue[] | undefined;
    label: string;
    record: ActivityRecord;
}) {
    if (
        record.schemaUnmet === true ||
        (record.direction === 'in' && (inboundIssues?.length ?? 0) > 0)
    ) {
        return <UnmetGlyph label={label} />;
    }

    return null;
}

function UnmetGlyph({ label }: { label: string }) {
    return (
        <span
            aria-label={label}
            className="flex w-6 shrink-0 items-center justify-center text-text-warning"
            data-part="activity-schema-unmet"
            role="img"
        >
            <WarningIcon size="sm" />
        </span>
    );
}

type ConnectionMessageRowProps = {
    entry: ConnectionMessageEntry;
};

/**
 * One frame of the timeline: what it is called, the head of its payload, time and size. The name
 * is what makes a row recognizable without opening it — the preview takes the room left over
 * between the name and the time, and stays one line however many the payload has.
 */
export const ConnectionMessageRow = memo(function ConnectionMessageRow({
    entry,
}: ConnectionMessageRowProps) {
    const messages = useMessages('connections');
    const language = useLanguage();
    const record = entry.detail;
    const inbound = record.direction === 'in';
    const name = recordNameOf(record);
    const inboundIssues = useInboundVerdict(entry);

    if (record.timedOut === true) {
        return <UnansweredAckRow entry={entry} />;
    }

    const Glyph = inbound ? ArrowInboundIcon : ArrowOutboundIcon;

    return (
        <div
            className={cn(
                'flex h-row min-w-0 flex-1 items-center gap-gap-group px-pad-control text-xs tabular-nums',
                record.replyTo !== undefined && 'ps-9',
            )}
            data-direction={record.direction}
            data-part="activity-row"
            data-reply={record.replyTo === undefined ? undefined : 'true'}
        >
            <span
                aria-label={messages(inbound ? 'directionIn' : 'directionOut')}
                className={cn(
                    'flex w-6 shrink-0 items-center justify-center',
                    inbound ? 'text-text-success' : 'text-text-info',
                )}
                data-part="activity-direction"
                role="img"
            >
                <Glyph size="sm" />
            </span>
            <span
                className="flex min-w-0 flex-1 items-center gap-gap-icon-text"
                data-part="activity-middle"
            >
                <UnmetMark
                    inboundIssues={inboundIssues}
                    label={messages('schemaUnmetTitle')}
                    record={record}
                />
                <FrameName name={name} />
                <FrameEvent event={record.event} />
                <span
                    className="min-w-0 flex-1 truncate text-text-secondary"
                    data-part="activity-preview"
                >
                    {messagePreview(record)}
                </span>
            </span>
            <FrameElapsed elapsedMs={record.elapsedMs} />
            <time
                className="w-16 shrink-0 text-text-secondary"
                dateTime={new Date(entry.at).toISOString()}
            >
                {formatActivityTime(entry.at, language)}
            </time>
            <span className="w-13 shrink-0 text-end">{formatByteSize(entry.bytes, language)}</span>
        </div>
    );
});

function FrameName({ name }: { name: string | null }) {
    if (name === null) {
        return null;
    }

    return (
        <span className="max-w-45 shrink-0 truncate font-semibold" data-part="activity-name">
            {name}
        </span>
    );
}

function FrameEvent({ event }: { event: ActivityRecord['event'] }) {
    if (event === undefined) {
        return null;
    }

    return (
        <span
            className="max-w-30 shrink-0 truncate font-mono text-text-secondary"
            data-part="activity-event"
        >
            {event}
        </span>
    );
}

function FrameElapsed({ elapsedMs }: { elapsedMs: ActivityRecord['elapsedMs'] }) {
    if (elapsedMs === undefined) {
        return null;
    }

    return (
        <span className="w-13 shrink-0 text-end text-text-secondary">
            {`${String(elapsedMs)} ms`}
        </span>
    );
}
