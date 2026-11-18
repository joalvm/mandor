import { connectionsStore } from './connections-store.js';
import { connectionIdOf } from './lib/connection-resource.js';

/**
 * The collection owns the name; the tab only knows where to look it up. Until the collection has
 * read the connection there is no name to give, and the id is never one.
 */
export function connectionTitle(resource: string): string {
    const id = connectionIdOf(resource);
    const connection = connectionsStore.getState().connections.find((each) => each.id === id);

    return connection?.name ?? '';
}

/** The titles of the connection tabs follow the collection: a rename shows on the tab at once. */
export function subscribeConnectionTitles(onChange: () => void): () => void {
    return connectionsStore.subscribe(onChange);
}
