import type { ComposerEvent } from '../../../../src/renderer/events/composer-events-store.js';

/** The event every composer test composes: a named event with a file behind it. */
export const EVENT: ComposerEvent = {
    dirty: false,
    eventName: 'Saludo',
    eventResource: 'mandor://demo/events/item/message/saludo',
    payload: '',
    payloadType: 'json',
    schema: '',
    expectAck: { enabled: false, timeoutMs: 10_000 },
};
