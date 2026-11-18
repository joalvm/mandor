import { z } from 'zod';

import type { HistoryEntry } from './history-entry.js';

/** What one row of the list needs. A failure keeps its code and never its message. */
export const historySummarySchema = z
    .object({
        id: z.uuid(),
        sentAt: z.iso.datetime(),
        itemPath: z.string().nullable(),
        method: z.string(),
        url: z.string(),
        outcome: z.discriminatedUnion('kind', [
            z
                .object({
                    kind: z.literal('response'),
                    status: z.number().int(),
                    totalMs: z.number().nonnegative(),
                    bodyBytes: z.number().int().nonnegative(),
                    /** A GraphQL answer with `errors` is a failure whatever its status says. */
                    graphqlErrors: z.number().int().nonnegative(),
                })
                .strict(),
            z.object({ kind: z.literal('failure'), code: z.string() }).strict(),
        ]),
    })
    .strict();

export type HistorySummary = z.infer<typeof historySummarySchema>;

/** The row of the list for an entry, so listing never ships a body across the bridge. */
export function historySummaryOf(entry: HistoryEntry): HistorySummary {
    const { outcome } = entry;
    const row = {
        id: entry.id,
        sentAt: entry.sentAt,
        itemPath: entry.itemPath,
        method: entry.request.method,
        url: entry.request.url,
    };

    if (outcome.kind === 'failure') {
        return { ...row, outcome: { kind: 'failure', code: outcome.code } };
    }

    return {
        ...row,
        outcome: {
            kind: 'response',
            status: outcome.response.status,
            totalMs: outcome.response.timings.totalMs,
            bodyBytes: outcome.response.sizes.bodyBytes,
            graphqlErrors: outcome.response.graphqlErrors?.count ?? 0,
        },
    };
}
