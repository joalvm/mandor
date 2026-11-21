import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    composedEvent,
    subscribeComposedEvents,
} from '../../../src/renderer/events/composed-event.js';
import { composerEventsStore } from '../../../src/renderer/events/composer-events-store.js';

const SALUDO = 'mandor://demo/events/item/message/saludo';

function compose(eventResource: string): void {
    composerEventsStore.getState().select('alpha', {
        eventName: 'Saludo',
        eventResource,
        payload: 'hola',
        payloadType: 'json',
        schema: '',
    });
}

beforeEach(() => {
    composerEventsStore.getState().reset();
});

describe('what a connection tab holds inside (composed-event)', () => {
    it('is the message of the collection its composer holds', () => {
        compose(SALUDO);

        expect(composedEvent('alpha')).toBe(SALUDO);
        expect(composedEvent('beta')).toBeNull();
    });

    /** Free text is a draft with no file behind it: the tree lists nothing for it. */
    it('is nothing while the composer holds free text', () => {
        compose('');

        expect(composedEvent('alpha')).toBeNull();
    });

    it('says when the composer took another message, and stops saying it once let go', () => {
        const onChange = vi.fn();
        const stop = subscribeComposedEvents(onChange);

        compose(SALUDO);

        expect(onChange).toHaveBeenCalledOnce();

        stop();
        compose('mandor://demo/events/item/message/adios');

        expect(onChange).toHaveBeenCalledOnce();
    });
});
