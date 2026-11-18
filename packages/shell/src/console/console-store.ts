import type { LogLine } from '@mandor/ui';
import { createStore } from 'zustand/vanilla';

import { scopeToOrigin } from '../origin/origin-scope.js';
import { type ConsoleRun, writtenRuns } from './console-runs.js';

type ConsoleState = {
    /** Whether the panel is out. View state: it is never written down, and a window opens without it. */
    open: boolean;
    runs: readonly ConsoleRun[];
};

type ConsoleActions = {
    toggle: () => void;
    show: () => void;
    hide: () => void;
    /** Writes lines under a run, opening it with its heading the first time it is named. */
    write: (run: { id: string; title: string }, lines: readonly LogLine[]) => void;
    clear: () => void;
};

type ConsoleStore = ConsoleActions & ConsoleState;

/**
 * The console of the window: what the work done in it wrote, run after run, in the order it was
 * written, as a browser keeps the console of its page. It is the window's and no feature's:
 * whoever runs something writes its lines here, and the panel only draws them. It holds what the
 * work of the open origin wrote, so it is emptied when the origin is left, and it stays under a
 * ceiling, the oldest runs leaving first.
 */
export const consoleStore = scopeToOrigin(
    createStore<ConsoleStore>()((set) => ({
        open: false,
        runs: [],
        toggle: () => {
            set((state) => ({ open: !state.open }));
        },
        show: () => {
            set({ open: true });
        },
        hide: () => {
            set({ open: false });
        },
        write: (run, lines) => {
            set((state) => ({ runs: writtenRuns(state.runs, run, lines) }));
        },
        clear: () => {
            set({ runs: [] });
        },
    })),
);

/** Writes lines to the console of the window, under the run of that id. */
export function writeConsole(run: { id: string; title: string }, lines: readonly LogLine[]): void {
    consoleStore.getState().write(run, lines);
}

/** Brings the console of the window out, as a way to it from where something went wrong. */
export function showConsole(): void {
    consoleStore.getState().show();
}
