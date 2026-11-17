import type { ErrorCode } from '@mandor/ipc';
import type { HttpResponse, RequestLine } from '@mandor/schema';

/**
 * Where the last send of a resource stands. A resource that never sent has no entry and reads as
 * `idle`; `sending` carries the id that can cut it; `done` and `failed` are exclusive, so a
 * failure never leaves an old response under it.
 */
export type SendEntry =
    | { state: 'idle' }
    | { sendId: string; state: 'sending' }
    | {
          /** The query the request carried, as written: it tells which example the answer stands for. */
          query?: RequestLine[] | undefined;
          response: HttpResponse;
          /** The send that brought it: what its scripts said is filed under this id. */
          sendId?: string | undefined;
          state: 'done';
      }
    | { error: ErrorCode; sendId?: string | undefined; state: 'failed' };

/** What a send ends in: the two entries that no longer wait for anything. */
export type SendOutcome = Extract<SendEntry, { state: 'done' | 'failed' }>;

export type ResponsesSlice = {
    /** Filed under the resource, not the panel: a tab moved between groups keeps its answer. */
    sends: Record<string, SendEntry>;
};

/** One value for every resource that never sent, so reading it never repaints. */
export const IDLE_SEND: SendEntry = { state: 'idle' };

export function initialResponsesSlice(): ResponsesSlice {
    return { sends: {} };
}
