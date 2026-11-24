import { createStore } from 'zustand/vanilla';

import { scopeToOrigin } from '../origin/origin-scope.js';
import {
    recordsOf,
    writtenEntries,
    type ConsoleRecord,
    type ConsoleWrite,
} from './console-entries.js';

type ConsoleState = {
    /** Whether the panel is out. View state: it is never written down, and a window opens without it. */
    open: boolean;
    entries: readonly ConsoleRecord[];
    /** How many entries were ever written: the key of the next one. */
    written: number;
};

type ConsoleActions = {
    toggle: () => void;
    show: () => void;
    hide: () => void;
    /** Writes entries at the end, stamped with the time they arrive. */
    write: (writes: readonly ConsoleWrite[]) => void;
    clear: () => void;
};

type ConsoleStore = ConsoleActions & ConsoleState;

/**
 * The console of the window: what the work done in it wrote, entry after entry, in the order it
 * was written, as a browser keeps the console of its page. It is the window's and no feature's:
 * whoever runs something writes here, and the panel only draws it. It holds what the work of the
 * open origin wrote, so it is emptied when the origin is left, and it stays under a ceiling, the
 * oldest entries leaving first.
 */
export const consoleStore = scopeToOrigin(
    createStore<ConsoleStore>()((set) => ({
        open: false,
        entries: [],
        written: 0,
        toggle: () => {
            set((state) => ({ open: !state.open }));
        },
        show: () => {
            set({ open: true });
        },
        hide: () => {
            set({ open: false });
        },
        write: (writes) => {
            if (writes.length === 0) {
                return;
            }

            set((state) => ({
                entries: writtenEntries(
                    state.entries,
                    recordsOf(writes, state.written, Date.now()),
                ),
                written: state.written + writes.length,
            }));
        },
        clear: () => {
            set({ entries: [] });
        },
    })),
);

/** Writes entries to the console of the window. */
export function writeConsole(writes: readonly ConsoleWrite[]): void {
    consoleStore.getState().write(writes);
}

/** Brings the console of the window out, as a way to it from where something went wrong. */
export function showConsole(): void {
    consoleStore.getState().show();
}
