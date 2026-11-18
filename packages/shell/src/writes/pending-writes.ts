import { fireAndForget } from '../fire-and-forget.js';
import { onOriginLeft } from '../origin/origin-scope.js';

/** How long the typing has to stop before an edit goes to disk. */
const QUIET = 400;

/** Every kind of edit on its way to disk, so the window can send them all out at once. */
const KINDS = new Set<() => Promise<void>>();

type Waiting<Value> = { timer: ReturnType<typeof setTimeout>; value: Value };

/** The edits of one kind of file on their way to disk, one per key. */
export type PendingWrites<Key extends string, Value> = {
    /** Waits for the typing to stop: a new edit of the key replaces the one waiting. */
    schedule: (key: Key, value: Value) => void;
    /** What the key waits to write, so a new edit can build on it. */
    waiting: (key: Key) => Value | undefined;
    /** Drops what the key waits to write, so a revert is not undone a moment after it lands. */
    cancel: (key: Key) => void;
    /** Writes what the key waits to write now, and answers once main has it. */
    flush: (key: Key) => Promise<void>;
    /** The same, for every key that matches. */
    flushWhere: (match: (key: Key) => boolean) => Promise<void>;
};

/**
 * There is no saving in these apps: the pause in the typing is the only moment there is, so an
 * edit goes to disk once it comes. The timer lives in the module and not inside a component:
 * closing the tab right after the last keystroke must not be what loses it.
 *
 * A flush is for the file that changed under the window and is about to be read again: what was
 * typed goes first, so main can merge it with the change instead of the read erasing it.
 *
 * `quiet` is the pause that counts as the end of the typing; what waits longer than a keystroke
 * (an approval of what was typed) asks for its own.
 */
export function createPendingWrites<Key extends string, Value>(
    write: (key: Key, value: Value) => Promise<void>,
    quiet = QUIET,
): PendingWrites<Key, Value> {
    const pending = new Map<Key, Waiting<Value>>();

    const cancel = (key: Key): void => {
        const waiting = pending.get(key);

        if (waiting !== undefined) {
            clearTimeout(waiting.timer);
            pending.delete(key);
        }
    };

    const flushWhere = async (match: (key: Key) => boolean): Promise<void> => {
        const due = [...pending].filter(([key]) => match(key));

        for (const [key] of due) {
            cancel(key);
        }

        // Each write leaves now, in this same turn: the window may be gone before the next one.
        await Promise.all(due.map(([key, { value }]) => write(key, value)));
    };

    KINDS.add(() => flushWhere(() => true));
    // The switch settles every edit before it leaves: what still waits was typed on the way out,
    // and a write that lands after it would land in the next origin.
    onOriginLeft(() => {
        for (const key of [...pending.keys()]) {
            cancel(key);
        }
    });

    return {
        schedule: (key, value) => {
            cancel(key);

            const timer = setTimeout(() => {
                pending.delete(key);
                fireAndForget(write(key, value));
            }, quiet);

            pending.set(key, { timer, value });
        },
        waiting: (key) => pending.get(key)?.value,
        cancel,
        flush: (key) => flushWhere((each) => each === key),
        flushWhere,
    };
}

/**
 * Writes now every edit still waiting for its pause, of every kind, and answers once main has
 * them: the window is about to close, or to leave its origin, and nothing typed may stay behind.
 */
export async function settlePendingWrites(): Promise<void> {
    await Promise.all([...KINDS].map((settle) => settle()));
}
