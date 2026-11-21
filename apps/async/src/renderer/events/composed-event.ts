import { composerEventsStore } from './composer-events-store.js';

/**
 * The message of the collection the composer of a connection holds, which is what the lateral
 * follows while the tab of the connection is in front: the tab is the connection, and the
 * message open in it has no tab of its own. Free text has no file behind it, so it names none.
 */
export function composedEvent(connectionId: string): string | null {
    const resource = composerEventsStore.getState().byConnection[connectionId]?.eventResource ?? '';

    return resource === '' ? null : resource;
}

/** Says when a composer took, moved or let go of what it holds, so the lateral asks again. */
export function subscribeComposedEvents(onChange: () => void): () => void {
    return composerEventsStore.subscribe(onChange);
}
