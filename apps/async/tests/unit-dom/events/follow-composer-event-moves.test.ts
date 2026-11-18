import { shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { composerEventsStore } from '../../../src/renderer/events/composer-events-store.js';
import { followComposerEventMoves } from '../../../src/renderer/events/follow-composer-event-moves.js';

const SALUDO = 'mandor://demo/events/item/mensajes/saludo';
const RENAMED = 'mandor://demo/events/item/mensajes/saludo-cordial';
const FOLDER = 'mandor://demo/events/item/mensajes';
const ARCHIVE = 'mandor://demo/events/item/archivo';
const ARCHIVED = 'mandor://demo/events/item/archivo/saludo';

let stop = (): void => undefined;

function holding(resource: string): void {
    composerEventsStore.getState().select('alpha', {
        eventName: 'Saludo',
        eventResource: resource,
        payload: 'hola',
        payloadType: 'json',
        schema: '',
    });
}

function held(): string {
    return composerEventsStore.getState().byConnection['alpha']?.eventResource ?? '';
}

beforeEach(() => {
    composerEventsStore.getState().reset();
    stop = followComposerEventMoves();
});

afterEach(() => {
    stop();
    composerEventsStore.getState().reset();
});

/**
 * Renaming an event while it is open is a rename, not a close: the composer keeps what it was
 * holding and keeps knowing where it came from. An event whose file moved under it is what
 * leaves the trail above the composer with nothing to hang from.
 */
describe('an event renamed while a composer holds it', () => {
    it('is held under the name it has now', () => {
        holding(SALUDO);

        shellStore.getState().moveResource(SALUDO, RENAMED);

        expect(held()).toBe(RENAMED);
    });

    it('follows the folder it was in when the folder is what was renamed', () => {
        holding(SALUDO);

        shellStore.getState().moveResource(FOLDER, ARCHIVE);

        expect(held()).toBe(ARCHIVED);
    });

    it('leaves alone an event that only starts like the one that moved', () => {
        holding('mandor://demo/events/item/mensajes-viejos/saludo');

        shellStore.getState().moveResource(FOLDER, ARCHIVE);

        expect(held()).toBe('mandor://demo/events/item/mensajes-viejos/saludo');
    });

    it('leaves the free text of a composer that holds no file alone', () => {
        composerEventsStore.getState().setPayload('alpha', 'hola');

        shellStore.getState().moveResource(SALUDO, RENAMED);

        expect(held()).toBe('');
    });

    it('stops following once the registration is let go', () => {
        holding(SALUDO);
        stop();

        shellStore.getState().moveResource(SALUDO, RENAMED);

        expect(held()).toBe(SALUDO);
    });
});
