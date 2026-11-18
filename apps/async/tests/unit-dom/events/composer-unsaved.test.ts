import { beforeEach, describe, expect, it } from 'vitest';

import { composerEventsStore } from '../../../src/renderer/events/composer-events-store.js';
import { composerUnsaved } from '../../../src/renderer/events/composer-unsaved.js';

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

describe('what closing a connection would lose (composer-unsaved)', () => {
    it('is an edit of a collection event that no save put back', () => {
        compose('mandor://demo/events/item/message/saludo');

        expect(composerUnsaved('alpha')).toBe(false);

        composerEventsStore.getState().setPayload('alpha', 'adiós');

        expect(composerUnsaved('alpha')).toBe(true);

        composerEventsStore.getState().markSaved('alpha');

        expect(composerUnsaved('alpha')).toBe(false);
    });

    it('is never free text, which has nowhere to be saved', () => {
        compose('');
        composerEventsStore.getState().setPayload('alpha', 'adiós');

        expect(composerUnsaved('alpha')).toBe(false);
        expect(composerUnsaved('nadie')).toBe(false);
    });
});
