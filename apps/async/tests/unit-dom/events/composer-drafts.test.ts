import { ROOT_GROUP_ID } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';
import { beforeEach, describe, expect, it } from 'vitest';

import { composerEventsStore } from '../../../src/renderer/events/composer-events-store.js';
import { registerComposerDrafts } from '../../../src/renderer/events/composer-drafts.js';

const RESOURCE = 'mandor://local/events/item/message/saludo';

const DRAFT = {
    dirty: true,
    eventName: 'Pedido creado',
    eventResource: RESOURCE,
    payload: '{ "borrador": true }',
    payloadType: 'json',
    schema: '',
};

function connectionTab(id: string): void {
    shellStore.getState().openTab(ROOT_GROUP_ID, {
        id,
        kind: 'connection',
        resource: `mandor://local/connection/${id}`,
    });
}

beforeEach(() => {
    shellStore.getState().reset();
    composerEventsStore.getState().reset();
});

describe('the draft a composer is left with', () => {
    it('is laid down on the session as the composer changes', () => {
        const stop = registerComposerDrafts();

        connectionTab('alpha');

        composerEventsStore.getState().select('alpha', {
            eventName: 'saludo',
            eventResource: RESOURCE,
            payload: 'hola',
            payloadType: 'json',
            schema: '',
        });

        expect(shellStore.getState().tabState['alpha']).toMatchObject({
            eventName: 'saludo',
            payload: 'hola',
        });

        stop();
    });

    it('lets the draft go when the tab closes, so the connection reopens empty', () => {
        const stop = registerComposerDrafts();

        connectionTab('alpha');

        composerEventsStore.getState().select('alpha', {
            eventName: 'saludo',
            eventResource: RESOURCE,
            payload: 'hola',
            payloadType: 'json',
            schema: '',
        });
        composerEventsStore.getState().clear('alpha');

        expect(shellStore.getState().tabState['alpha']).toBeUndefined();

        stop();
    });

    it('comes back with the app, dirty flag included, when a session lands', () => {
        const stop = registerComposerDrafts();

        shellStore.setState({ tabState: { alpha: DRAFT } });

        expect(composerEventsStore.getState().byConnection['alpha']).toEqual(DRAFT);

        stop();
    });

    it('leaves out a bag entry that is not a draft', () => {
        const stop = registerComposerDrafts();

        shellStore.setState({ tabState: { alpha: { payload: 42 } } });

        expect(composerEventsStore.getState().byConnection['alpha']).toBeUndefined();

        stop();
    });

    it('does not step on a composer that is already holding an event', () => {
        const stop = registerComposerDrafts();

        connectionTab('alpha');

        composerEventsStore.getState().select('alpha', {
            eventName: 'otro',
            eventResource: RESOURCE,
            payload: '',
            payloadType: 'json',
            schema: '',
        });

        shellStore.setState({ tabState: { alpha: DRAFT } });

        expect(composerEventsStore.getState().byConnection['alpha']).toMatchObject({
            eventName: 'otro',
        });

        stop();
    });

    it('hears no more once it is told to stop', () => {
        const stop = registerComposerDrafts();

        stop();

        connectionTab('alpha');

        composerEventsStore.getState().select('alpha', {
            eventName: 'saludo',
            eventResource: RESOURCE,
            payload: 'hola',
            payloadType: 'json',
            schema: '',
        });

        expect(shellStore.getState().tabState['alpha']).toBeUndefined();
    });
});
