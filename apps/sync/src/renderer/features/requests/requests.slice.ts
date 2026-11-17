import type { RequestItem } from '@mandor/schema';

/** What was typed and is on its way to the file: the draft, and what the disk last held. */
export type PendingRequest = { before: RequestItem | undefined; request: RequestItem };

export type RequestsSlice = {
    /** What the disk said, filed under the resource so two views of one item share one answer. */
    requests: Record<string, RequestItem>;
    /** Resources with a read in flight. A second view asks nothing and waits for the first. */
    reading: string[];
    /** The drafts a write is carrying: the strip reads them to say which sections are dirty. */
    pendings: Record<string, PendingRequest | undefined>;
};

export function initialRequestsSlice(): RequestsSlice {
    return { pendings: {}, reading: [], requests: {} };
}
