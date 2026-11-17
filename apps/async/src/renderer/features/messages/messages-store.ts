import type { MessageItem } from '@mandor/schema';
import { scopeToOrigin } from '@mandor/shell';
import { createStore, type StoreApi } from 'zustand/vanilla';

import { initialMessagesSlice, type MessagesSlice } from './messages.slice.js';

type MessagesActions = {
    beginRead: (resource: string) => void;
    finishRead: (resource: string, message: MessageItem | null) => void;
    /** Lets go of an item once its last view is gone; a read still in flight finds nothing to fill. */
    forget: (resource: string) => void;
    reset: () => void;
    setMessage: (resource: string, message: MessageItem) => void;
};

type MessagesStore = MessagesActions & MessagesSlice;
export type MessagesStoreApi = StoreApi<MessagesStore>;

function without<Value>(entries: Record<string, Value>, key: string): Record<string, Value> {
    return Object.fromEntries(Object.entries(entries).filter(([each]) => each !== key));
}

function actionsFor(set: MessagesStoreApi['setState']): MessagesActions {
    const actions: MessagesActions = {
        beginRead: (resource) => {
            set((state) => ({ reading: [...state.reading, resource] }));
        },
        /**
         * A read that brought nothing leaves the resource without an entry. The tab stays empty
         * and says so; what went wrong was already told as a toast by whoever asked.
         */
        finishRead: (resource, message) => {
            set((state) => ({
                messages:
                    message === null || !state.reading.includes(resource)
                        ? state.messages
                        : { ...state.messages, [resource]: message },
                reading: state.reading.filter((each) => each !== resource),
            }));
        },
        forget: (resource) => {
            set((state) => ({
                messages: without(state.messages, resource),
                reading: state.reading.filter((each) => each !== resource),
            }));
        },
        reset: () => {
            set({ ...initialMessagesSlice(), ...actions }, true);
        },
        /** What the strip edited, in front of the write: two views of the item agree at once. */
        setMessage: (resource, message) => {
            set((state) => ({ messages: { ...state.messages, [resource]: message } }));
        },
    };

    return actions;
}

function createMessagesStore(): MessagesStoreApi {
    return createStore<MessagesStore>()((set) => {
        const actions = actionsFor(set);

        return { ...initialMessagesSlice(), ...actions };
    });
}

export const messagesStore = scopeToOrigin(createMessagesStore());
