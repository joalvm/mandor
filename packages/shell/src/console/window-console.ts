import type { LogLine } from '@mandor/ui';

/** A line the window itself writes to its console: a notice it showed or a fault it took. */
export type WindowLine = Omit<LogLine, 'key'>;

type Listener = (line: WindowLine) => void;

const listeners = new Set<Listener>();

/**
 * Hands a line to the console of the window. Before the console is mounted nobody hears it; the
 * log of main keeps every fault anyway.
 */
export function tellWindowConsole(line: WindowLine): void {
    for (const listener of listeners) {
        listener(line);
    }
}

/** Hears every line the window writes from now on. */
export function onWindowConsole(listener: Listener): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}
