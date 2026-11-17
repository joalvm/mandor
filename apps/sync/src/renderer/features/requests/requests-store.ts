import type { RequestItem } from '@mandor/schema';
import { scopeToOrigin } from '@mandor/shell';
import { createStore, type StoreApi } from 'zustand/vanilla';

import { initialExamplesSlice, type ExampleDraft, type ExamplesSlice } from './examples.slice.js';
import { initialRequestsSlice, type PendingRequest, type RequestsSlice } from './requests.slice.js';
import { initialResponsesSlice, type ResponsesSlice, type SendOutcome } from './responses.slice.js';

type RequestsActions = {
    beginRead: (resource: string) => void;
    beginSend: (resource: string, sendId: string) => void;
    clearExampleDraft: (resource: string) => void;
    clearPending: (resource: string) => void;
    /** Lets go of the answer of the last send: the resource reads as never sent. */
    clearSend: (resource: string) => void;
    finishRead: (resource: string, request: RequestItem | null) => void;
    finishSend: (resource: string, sendId: string, outcome: SendOutcome) => void;
    /** Lets go of a request once its last view is gone; a read or a send still in flight finds nothing to fill. */
    forget: (resource: string) => void;
    /** The draft and the send of an example go with it when its name, and so its resource, changes. */
    moveExample: (from: string, to: string) => void;
    reset: () => void;
    setExampleDraft: (resource: string, draft: ExampleDraft) => void;
    setPending: (resource: string, pending: PendingRequest) => void;
    setRequest: (resource: string, request: RequestItem) => void;
};

type RequestsStore = RequestsActions & RequestsSlice & ResponsesSlice & ExamplesSlice;
export type RequestsStoreApi = StoreApi<RequestsStore>;

function without<Value>(entries: Record<string, Value>, key: string): Record<string, Value> {
    return Object.fromEntries(Object.entries(entries).filter(([each]) => each !== key));
}

function moved<Value>(
    entries: Record<string, Value>,
    from: string,
    to: string,
): Record<string, Value> {
    const entry = entries[from];

    return entry === undefined ? entries : { ...without(entries, from), [to]: entry };
}

function actionsFor(set: RequestsStoreApi['setState']): RequestsActions {
    const actions: RequestsActions = {
        beginRead: (resource) => {
            set((state) => ({ reading: [...state.reading, resource] }));
        },
        /** A new send leaves nothing of the last one: its answer is not the answer to this. */
        beginSend: (resource, sendId) => {
            set((state) => ({
                sends: { ...state.sends, [resource]: { sendId, state: 'sending' } },
            }));
        },
        clearExampleDraft: (resource) => {
            set((state) => ({ exampleDrafts: without(state.exampleDrafts, resource) }));
        },
        clearPending: (resource) => {
            set((state) => ({ pendings: without(state.pendings, resource) }));
        },
        clearSend: (resource) => {
            set((state) => ({ sends: without(state.sends, resource) }));
        },
        /**
         * A read that brought nothing leaves the resource without an entry. The tab stays empty
         * and says so; what went wrong was already told as a toast by whoever asked.
         */
        finishRead: (resource, request) => {
            set((state) => ({
                reading: state.reading.filter((each) => each !== resource),
                requests:
                    request === null || !state.reading.includes(resource)
                        ? state.requests
                        : { ...state.requests, [resource]: request },
            }));
        },
        forget: (resource) => {
            set((state) => ({
                exampleDrafts: without(state.exampleDrafts, resource),
                pendings: without(state.pendings, resource),
                reading: state.reading.filter((each) => each !== resource),
                requests: without(state.requests, resource),
                sends: without(state.sends, resource),
            }));
        },
        /**
         * Only the send still in flight is answered: a late one finds its place taken. The answer
         * keeps the id of its send, which is what the output of its scripts is filed under.
         */
        finishSend: (resource, sendId, outcome) => {
            set((state) => {
                const entry = state.sends[resource];

                if (entry?.state !== 'sending' || entry.sendId !== sendId) {
                    return state;
                }

                return { sends: { ...state.sends, [resource]: { ...outcome, sendId } } };
            });
        },
        moveExample: (from, to) => {
            set((state) => ({
                exampleDrafts: moved(state.exampleDrafts, from, to),
                sends: moved(state.sends, from, to),
            }));
        },
        reset: () => {
            set(
                {
                    ...initialRequestsSlice(),
                    ...initialResponsesSlice(),
                    ...initialExamplesSlice(),
                    ...actions,
                },
                true,
            );
        },
        /** What the panel edited, in front of the write: two views of the item agree at once. */
        setRequest: (resource, request) => {
            set((state) => ({ requests: { ...state.requests, [resource]: request } }));
        },
        /** What was typed into an example: it waits for Ctrl+S, apart from its request's draft. */
        setExampleDraft: (resource, draft) => {
            set((state) => ({ exampleDrafts: { ...state.exampleDrafts, [resource]: draft } }));
        },
        setPending: (resource, pending) => {
            set((state) => ({ pendings: { ...state.pendings, [resource]: pending } }));
        },
    };

    return actions;
}

export function createRequestsStore(): RequestsStoreApi {
    return createStore<RequestsStore>()((set) => {
        const actions = actionsFor(set);

        return {
            ...initialRequestsSlice(),
            ...initialResponsesSlice(),
            ...initialExamplesSlice(),
            ...actions,
        };
    });
}

export const requestsStore = scopeToOrigin(createRequestsStore());
