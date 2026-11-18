import { composerEventsStore } from '../../../../../src/renderer/events/composer-events-store.js';

/**
 * Puts an event in front of a connection, which is what the panel needs before it draws the
 * composer at all: a connection holding none answers with the way back to the collection.
 */
export function openComposerEvent(connectionId: string): void {
    composerEventsStore.getState().select(connectionId, {
        eventName: 'Saludo',
        eventResource: 'mandor://demo/payments/item/message/saludo',
        payload: '',
        payloadType: 'json',
        schema: '',
        expectAck: { enabled: false, timeoutMs: 10_000 },
    });
}
