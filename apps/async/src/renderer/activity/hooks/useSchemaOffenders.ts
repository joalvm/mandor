import { fireAndForget } from '@mandor/shell';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { ActivityEntry } from '../activity-entry.js';
import { judgeable, judgeInbound } from '../inbound-verdict.js';

/** One stable empty answer for every timeline the mark is off in. */
const EMPTY: ReadonlySet<string> = new Set();

/**
 * The ids the schema mark of the filter can vouch for: the frames that left carrying the mark of
 * having broken their schema, and the inbound ones the judge condemned. The mark turns the
 * judging on — nothing is judged for a filter nobody asked for — and what carries no verdict
 * yet is not named, because the mark vouches for what it named and for nothing else.
 */
export function useSchemaOffenders(
    entries: readonly ActivityEntry[],
    enabled: boolean,
): ReadonlySet<string> {
    const [condemned, setCondemned] = useState<ReadonlySet<string>>(EMPTY);
    const inFlight = useRef(new Set<string>());

    const marked = useMemo(() => {
        const ids = new Set<string>();

        for (const entry of entries) {
            if (entry.kind === 'connection-message' && entry.detail.schemaUnmet === true) {
                ids.add(entry.id);
            }
        }

        return ids;
    }, [entries]);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        for (const entry of entries) {
            if (
                entry.kind !== 'connection-message' ||
                inFlight.current.has(entry.id) ||
                !judgeable(entry.detail)
            ) {
                continue;
            }

            inFlight.current.add(entry.id);

            // A verdict is kept even when the timeline moved on while it was judged: the frame is
            // in flight, so the next pass skips it, and a closed connection brings no next pass.
            fireAndForget(
                judgeInbound(entry, entry.detail)
                    .then((issues) => {
                        if (issues.length > 0) {
                            setCondemned((current) => new Set(current).add(entry.id));
                        }
                    })
                    .finally(() => {
                        inFlight.current.delete(entry.id);
                    }),
            );
        }
    }, [entries, enabled]);

    return useMemo(() => {
        if (!enabled) {
            return EMPTY;
        }

        if (marked.size === 0) {
            return condemned;
        }

        return new Set([...marked, ...condemned]);
    }, [condemned, enabled, marked]);
}
