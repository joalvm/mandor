import { composerEventsStore } from './composer-events-store.js';

/**
 * Whether the composer of the connection holds an edit of an event of the collection that no save
 * put back yet: what closing the tab would lose. Free text has no file behind it and nowhere to
 * be saved, so it goes with the tab as it always did.
 */
export function composerUnsaved(connectionId: string): boolean {
    const event = composerEventsStore.getState().byConnection[connectionId];

    return event !== undefined && event.dirty && event.eventResource !== '';
}
