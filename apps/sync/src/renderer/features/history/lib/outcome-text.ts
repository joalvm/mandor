import type { HistorySummary } from '@mandor/schema';

/** How the send ended, in one word of the row: the status of an answer, the code of a failure. */
export function outcomeText({ outcome }: HistorySummary): string {
    if (outcome.kind === 'failure') {
        return outcome.code;
    }

    return String(outcome.status);
}
