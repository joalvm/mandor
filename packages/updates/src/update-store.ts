import type { UpdateState } from '@mandor/ipc';
import { createStore } from 'zustand/vanilla';

export type UpdateStoreState = {
    /** The version already told to the person with a toast, so a repeat does not tell it twice. */
    announced: string | undefined;
    /** What main last said, whole. Nothing until it has spoken. */
    state: UpdateState | undefined;
};

export type UpdateStoreActions = {
    /** Answers whether this is the first time the version is announced, and remembers it. */
    announce: (version: string) => boolean;
    reset: () => void;
    setState: (state: UpdateState) => void;
};

// store-scope: window — the updates belong to the app being run, not to the origin open in it.
export const updateStore = createStore<UpdateStoreActions & UpdateStoreState>()((set, get) => ({
    announced: undefined,
    state: undefined,
    announce: (version) => {
        if (get().announced === version) {
            return false;
        }

        set({ announced: version });

        return true;
    },
    reset: () => {
        set({ announced: undefined, state: undefined });
    },
    setState: (state) => {
        set({ state });
    },
}));
