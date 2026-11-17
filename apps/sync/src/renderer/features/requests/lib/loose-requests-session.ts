import { requestItemSchema, type RequestItem } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { z } from 'zod';

import { requestsStore } from '../requests-store.js';
import type { PendingRequest } from '../requests.slice.js';
import { loosePartsOf, looseTabId } from './loose-resource.js';
import { editRequest } from './pending-request-write.js';

/** A request saved nowhere as the session carries it: as it stands, and as it was before its edit. */
const looseSchema = z.object({
    before: requestItemSchema.nullable(),
    request: requestItemSchema,
    resource: z.string(),
});

type LooseOnSession = z.infer<typeof looseSchema>;

/**
 * A request saved nowhere lives in the window, never in the work: no file holds it. What dies
 * with the app is another thing — a window opened again brings each of them back as it was left,
 * with the edit it held still unsaved, the way the session brings its tab back. Closing the tab is
 * letting it go.
 *
 * They travel on the session's `tabState`, keyed by the id of the tab that holds each one. The
 * bag is this module's alone in Mandor Request: it lays it down on every change of a request
 * saved nowhere, and picks it back up when a session lands.
 */
export function registerLooseRequests(): () => void {
    let carried: Record<string, unknown> | null = null;
    let laid: Record<string, LooseOnSession> = {};
    let laying = false;

    const layDown = requestsStore.subscribe((state) => {
        const bag = looseBagOf(state.requests, state.pendings);

        if (!sameBag(bag, laid)) {
            laid = bag;
            laying = true;
            shellStore.getState().setTabState(bag);
            laying = false;
        }
    });

    const pickUp = shellStore.subscribe((state) => {
        // Every other change of the window leaves the bag as it was. The bag this module lays down
        // itself holds what the window already has: only one a session load brings is picked up.
        if (state.tabState === carried) {
            return;
        }

        carried = state.tabState;

        if (laying) {
            return;
        }

        for (const value of Object.values(state.tabState)) {
            restore(looseSchema.safeParse(value).data);
        }
    });

    return () => {
        layDown();
        pickUp();
    };
}

/** Brings one back, unless the window already holds it: the edit is an edit again. */
function restore(loose: LooseOnSession | undefined): void {
    if (loose === undefined || loosePartsOf(loose.resource) === null) {
        return;
    }

    if (requestsStore.getState().requests[loose.resource] !== undefined) {
        return;
    }

    requestsStore.getState().setRequest(loose.resource, loose.before ?? loose.request);

    if (loose.before !== null) {
        editRequest(loose.resource, loose.request);
    }
}

/**
 * Whether two bags hold the very same requests. The store hands over a new request at each edit
 * and keeps the others as they were, so this tells an edit of one saved nowhere from any other
 * change without reading a body: spelling the bag out at every key typed anywhere cost 21 ms and
 * 14 MB of text for one request holding a body of 5 MB.
 */
function sameBag(
    bag: Record<string, LooseOnSession>,
    laid: Record<string, LooseOnSession>,
): boolean {
    const ids = Object.keys(bag);

    if (ids.length !== Object.keys(laid).length) {
        return false;
    }

    return ids.every((id) => {
        const was = laid[id];
        const now = bag[id];

        return was?.request === now?.request && was?.before === now?.before;
    });
}

/** The bag the session carries: one entry per request saved nowhere, under the id of its tab. */
function looseBagOf(
    requests: Record<string, RequestItem>,
    pendings: Record<string, PendingRequest | undefined>,
): Record<string, LooseOnSession> {
    return Object.fromEntries(
        Object.entries(requests).flatMap(([resource, request]) => {
            const parts = loosePartsOf(resource);

            if (parts === null) {
                return [];
            }

            const before = pendings[resource]?.before ?? null;

            return [[looseTabId(parts.id), { before, request, resource }]];
        }),
    );
}
