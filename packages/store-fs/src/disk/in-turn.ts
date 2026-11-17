/** The last piece of work of each key: the next one waits for it. */
const TURNS = new Map<string, Promise<unknown>>();

/**
 * Runs `work` once every piece of work given the same key before it is done, whether it ended
 * well or not. A file written whole after reading it, or a check followed by a file operation,
 * is two steps: another one in between loses an update or acts on what is no longer true. The
 * key is what they share, most often the path of the file.
 *
 * The root of a repo is a key too: whatever touches its tree — a write, the commit after it, a
 * step of synchronization — takes that turn, in the order it arrived, so nothing reads or
 * rewrites the tree half way through another's change. A save in one repo never waits for one in
 * another, and work that failed gives its turn back: one refused write must not hold the key.
 */
export async function inTurn<T>(key: string, work: () => Promise<T>): Promise<T> {
    const before = TURNS.get(key) ?? Promise.resolve();
    const turn = before.then(work, work);
    const settled = turn.catch(() => undefined);

    TURNS.set(key, settled);

    try {
        return await turn;
    } finally {
        if (TURNS.get(key) === settled) {
            TURNS.delete(key);
        }
    }
}
