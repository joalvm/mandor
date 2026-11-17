import { useMessages } from '@mandor/i18n';
import type { HistoryEntry } from '@mandor/schema';
import { Collapsible, CollapsibleBody, CollapsibleHeader } from '@mandor/ui';
import { useState } from 'react';

import { ResponseHeaders } from '../../../../response/ResponseHeaders.js';
import { ResponsePanel } from '../../../../response/ResponsePanel.js';
import { failureCodeOf } from '../../lib/failure-code.js';

type HistoryEntryViewProps = {
    entry: HistoryEntry;
    resource: string;
};

type SendOutcomeProps = {
    outcome: HistoryEntry['outcome'];
    /** The resource the views of the answer file their state under, one per send. */
    resource: string;
};

const BAND = 'flex h-header min-w-0 shrink-0 items-center gap-gap-control px-pad-panel text-sm';

/** How the send ended: the answer drawn by the views of a live one, or why there is none. */
function SendOutcome({ outcome, resource }: SendOutcomeProps) {
    const errors = useMessages('errors');

    if (outcome.kind === 'failure') {
        return (
            <div className={BAND} data-part="history-entry-failure">
                <span className="min-w-0 truncate text-text-error">
                    {errors(failureCodeOf(outcome.code))}
                </span>
            </div>
        );
    }

    return (
        <div className="min-h-0 flex-1">
            <ResponsePanel resource={resource} response={outcome.response} />
        </div>
    );
}

/**
 * One send in full, read only: the request as it left, and under it what came back. The answer
 * is drawn by the views the request panel draws it with, so a stored send reads like a live one.
 * A send that never got an answer says why in the words of its error, and has nothing under it.
 */
export function HistoryEntryView({ entry, resource }: HistoryEntryViewProps) {
    const labels = useMessages('history');
    const [sentOpen, setSentOpen] = useState(false);
    const { outcome, request } = entry;

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col" data-part="history-entry">
            <div className={BAND} data-part="history-entry-request">
                <span className="shrink-0 font-semibold text-text-secondary">{request.method}</span>
                <span className="min-w-0 truncate text-text-primary">{request.url}</span>
            </div>
            <Collapsible onOpenChange={setSentOpen} open={sentOpen}>
                <CollapsibleHeader title={labels('sentRequest')} />
                <CollapsibleBody>
                    <ResponseHeaders headers={request.headers} />
                </CollapsibleBody>
            </Collapsible>
            <SendOutcome outcome={outcome} resource={`${resource}#${entry.id}`} />
        </div>
    );
}
