/** What a feature is told when a resource it may be holding something under has moved. */
export type ResourceMoveListener = (from: string, to: string) => void;

const LISTENERS = new Set<ResourceMoveListener>();

/**
 * Asks to hear about resources that move, and answers with the way to stop hearing about them.
 *
 * The window rewrites its own layout when a file is renamed, and that is all it can rewrite: a
 * composer holding the event, a buffer of what arrived through a connection, anything else filed
 * under the resource lives in a feature the window cannot import. The sentence is said once here
 * and every listener follows its own things.
 */
export function registerResourceMove(listener: ResourceMoveListener): () => void {
    LISTENERS.add(listener);

    return () => {
        LISTENERS.delete(listener);
    };
}

/** Says a resource moved, to everyone listening. Announced by the window, never by a feature. */
export function announceResourceMove(from: string, to: string): void {
    for (const listener of LISTENERS) {
        listener(from, to);
    }
}
