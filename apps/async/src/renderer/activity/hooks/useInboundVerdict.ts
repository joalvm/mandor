import type { ActivityRecord } from '@mandor/ipc';
import { fireAndForget } from '@mandor/shell';
import type { TemplateIssue } from '@mandor/validate';
import { useEffect, useState } from 'react';

import { inboundVerdictOf, judgeable, judgeInbound } from '../inbound-verdict.js';

/**
 * What an inbound frame owes the schema of the item it pairs with, judged once and remembered:
 * the channel or event it answered names the item, the item names its schema, and the frame
 * either meets it or the verdict lists why not. Frames that pair with nothing —no item, no
 * schema, nothing that parses— stay unjudged: silence, never an invented warning.
 */
export function useInboundVerdict(entry: { id: string; detail: ActivityRecord }): TemplateIssue[] {
    const record = entry.detail;
    const [issues, setIssues] = useState<TemplateIssue[] | undefined>(() =>
        inboundVerdictOf(entry),
    );

    useEffect(() => {
        if (!judgeable(record)) {
            return;
        }

        let cancelled = false;

        fireAndForget(
            judgeInbound(entry, record).then((verdict) => {
                if (!cancelled) {
                    setIssues(verdict);
                }
            }),
        );

        return () => {
            cancelled = true;
        };
    }, [entry, record]);

    return issues ?? [];
}
