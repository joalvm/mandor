import { useLanguage, useMessages } from '@mandor/i18n';
import { StatusText } from '@mandor/ui';

import { formatDuration } from '../../../../response/lib/format-response.js';
import type { SendEntry } from '../../responses.slice.js';

type SendAnnouncementProps = {
    entry: SendEntry;
};

/** What the two states that carry nothing say: the send on its way, and nothing before there is one. */
const WAIT_WORD = { idle: undefined, sending: 'sending' } as const;

/**
 * What the send says to a reader who cannot see the half: that it is on its way, how it came
 * back or why it did not. It is one region that stays where it is while the half under it
 * changes, because a reader announces a change in a region it already knew and misses one that
 * appears with its words in it. The eye has the half itself; this is only the ear's copy, and it
 * says each state once.
 */
export function SendAnnouncement({ entry }: SendAnnouncementProps) {
    const errors = useMessages('errors');
    const labels = useMessages('requests');
    const language = useLanguage();

    if ('response' in entry) {
        const { status, statusText, timings } = entry.response;

        return (
            <StatusText className="sr-only">
                {labels('sendReceived', {
                    status: String(status),
                    statusText,
                    time: formatDuration(timings.totalMs, language),
                })}
            </StatusText>
        );
    }

    if ('error' in entry) {
        return <StatusText className="sr-only">{errors(entry.error)}</StatusText>;
    }

    const word = WAIT_WORD[entry.state];

    return <StatusText className="sr-only">{word === undefined ? '' : labels(word)}</StatusText>;
}
