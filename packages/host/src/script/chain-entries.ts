import { scriptNotice, type ChainLog, type ScriptLevel, type SkippedScript } from '@mandor/schema';
import { SCRIPT_LIMITS, type ScriptRunInput } from '@mandor/script';

import { approvalKey } from './approval-key.js';
import type { ApprovedScripts } from './approved-scripts.js';

/** One script of a chain, where it sits and the visible name of what holds it. */
export type ChainEntry = {
    level: ScriptLevel;
    name: string;
    event: ScriptRunInput['event'];
    source: string;
    enabled?: boolean | undefined;
};

/** Whose approvals count: the origin open and the workspace of the send. */
export type ChainPlace = { origin: string; workspaceId: string };

export type SortedEntries = {
    runnable: ChainEntry[];
    skipped: SkippedScript[];
    logs: ChainLog[];
};

type Verdict = 'tooLarge' | 'approved' | 'unapproved';

type Sorting = SortedEntries & { shown: number };

async function verdictOf(
    entry: ChainEntry,
    place: ChainPlace,
    approvals: Pick<ApprovedScripts, 'isApproved'>,
): Promise<Verdict> {
    if (Buffer.byteLength(entry.source) > SCRIPT_LIMITS.sourceBytes) {
        return 'tooLarge';
    }

    const { origin, workspaceId } = place;
    const { level, event, source } = entry;
    const approved = await approvals.isApproved(
        approvalKey({ origin, workspaceId, level, event, source }),
    );

    return approved ? 'approved' : 'unapproved';
}

/** A script nobody approved, with its text while the texts shown so far fit in an output. */
function skip(sorting: Sorting, entry: ChainEntry): void {
    const { name, level, event, source } = entry;
    const bytes = Buffer.byteLength(source);
    const fits = sorting.shown + bytes <= SCRIPT_LIMITS.outputBytes;

    sorting.shown += fits ? bytes : 0;
    sorting.skipped.push({ name, level, event, bytes, ...(fits ? { source } : {}) });
}

const SORT: Record<Verdict, (sorting: Sorting, entry: ChainEntry) => void> = {
    tooLarge: (sorting, { event }) => {
        sorting.logs.push(
            scriptNotice('script-too-large', { event, limit: SCRIPT_LIMITS.sourceBytes }),
        );
    },
    approved: (sorting, entry) => {
        sorting.runnable.push(entry);
    },
    unapproved: skip,
};

/**
 * What of a chain runs, in its order: the scripts approved on this machine for their text and
 * their place. The others are skipped and told, and a text over the size a script may have leaves
 * a line instead, with nothing to approve.
 */
export async function sortEntries(
    entries: readonly ChainEntry[],
    place: ChainPlace,
    approvals: Pick<ApprovedScripts, 'isApproved'>,
): Promise<SortedEntries> {
    const sorting: Sorting = { runnable: [], skipped: [], logs: [], shown: 0 };
    const verdicts = await Promise.all(entries.map((entry) => verdictOf(entry, place, approvals)));

    entries.forEach((entry, index) => {
        SORT[verdicts[index] ?? 'unapproved'](sorting, entry);
    });

    const { runnable, skipped, logs } = sorting;

    return { runnable, skipped, logs };
}
