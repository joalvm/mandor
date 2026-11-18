import { beforeEach, describe, expect, it } from 'vitest';

import { composerEventsStore } from '../../../src/renderer/events/composer-events-store.js';

beforeEach(() => {
    composerEventsStore.getState().reset();
});

describe('the composer events store', () => {
    it('holds one event per connection, clean when it arrives', () => {
        composerEventsStore.getState().select('alpha', {
            eventName: 'Saludo',
            eventResource: 'mandor://demo/events/item/message/saludo',
            payload: 'hola',
            payloadType: 'json',
            schema: '',
        });

        expect(composerEventsStore.getState().byConnection['alpha']).toEqual({
            dirty: false,
            eventName: 'Saludo',
            eventResource: 'mandor://demo/events/item/message/saludo',
            payload: 'hola',
            payloadType: 'json',
            schema: '',
        });
    });

    it('marks the event dirty on typing and clean again on a save', () => {
        composerEventsStore.getState().select('alpha', {
            eventName: 'Saludo',
            eventResource: 'mandor://demo/events/item/message/saludo',
            payload: '',
            payloadType: 'json',
            schema: '',
        });

        composerEventsStore.getState().setPayload('alpha', '{"a":1}');

        expect(composerEventsStore.getState().byConnection['alpha']?.dirty).toBe(true);

        composerEventsStore.getState().markSaved('alpha');

        expect(composerEventsStore.getState().byConnection['alpha']?.dirty).toBe(false);
        expect(composerEventsStore.getState().byConnection['alpha']?.payload).toBe('{"a":1}');
    });

    it('marks the event dirty when the declared format changes', () => {
        composerEventsStore.getState().select('alpha', {
            eventName: 'Saludo',
            eventResource: 'mandor://demo/events/item/message/saludo',
            payload: 'hola',
            payloadType: 'text',
            schema: '',
        });

        composerEventsStore.getState().setPayloadType('alpha', 'json');

        expect(composerEventsStore.getState().byConnection['alpha']).toMatchObject({
            dirty: true,
            payloadType: 'json',
            schema: '',
        });
    });

    it('keeps free text as a draft whose format is the schema default', () => {
        composerEventsStore.getState().setPayload('alpha', 'hola');

        expect(composerEventsStore.getState().byConnection['alpha']).toMatchObject({
            dirty: true,
            eventResource: '',
            payload: 'hola',
            payloadType: 'json',
            schema: '',
        });
    });

    it('forgets the composer of a connection that closed', () => {
        composerEventsStore.getState().select('alpha', {
            eventName: 'Saludo',
            eventResource: 'mandor://demo/events/item/message/saludo',
            payload: '',
            payloadType: 'json',
            schema: '',
        });

        composerEventsStore.getState().clear('alpha');

        expect(composerEventsStore.getState().byConnection['alpha']).toBeUndefined();
    });
});
