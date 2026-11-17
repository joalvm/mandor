import { success } from '@mandor/ipc';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../src/renderer/app/async-bridge.js';
import { composerEventsStore } from '../../../src/renderer/events/composer-events-store.js';
import { saveEventInComposer } from '../../../src/renderer/events/save-event-in-composer.js';

const readItem = vi
    .spyOn(asyncBridge.collections, 'readItem')
    .mockResolvedValue(success({ kind: 'message', name: 'saludo', payload: 'viejo' }));
const writeItem = vi.spyOn(asyncBridge.collections, 'writeItem').mockResolvedValue(success({}));

const RESOURCE = 'mandor://local/events/item/message/saludo';

beforeEach(() => {
    composerEventsStore.getState().reset();
    readItem.mockClear();
    writeItem.mockClear();
});

describe('saving the event in the composer', () => {
    it('writes the payload into the file it came from and comes out clean', async () => {
        composerEventsStore.getState().select('alpha', {
            eventName: 'saludo',
            eventResource: RESOURCE,
            payload: '',
            payloadType: 'json',
            schema: '',
        });
        composerEventsStore.getState().setPayload('alpha', 'nuevo');

        expect(await saveEventInComposer('alpha')).toBeNull();

        expect(writeItem).toHaveBeenCalledWith({
            fields: { kind: 'message', name: 'saludo', payload: 'nuevo', payloadType: 'json' },
            path: 'message/saludo',
            workspaceId: 'events',
        });
        expect(composerEventsStore.getState().byConnection['alpha']?.dirty).toBe(false);
    });

    it('writes the declared format alongside the payload', async () => {
        composerEventsStore.getState().select('alpha', {
            eventName: 'saludo',
            eventResource: RESOURCE,
            payload: 'igual',
            payloadType: 'text',
            schema: '',
        });
        composerEventsStore.getState().setPayloadType('alpha', 'json');
        composerEventsStore.getState().setPayload('alpha', '{}');

        expect(await saveEventInComposer('alpha')).toBeNull();

        expect(writeItem).toHaveBeenCalledWith({
            fields: { kind: 'message', name: 'saludo', payload: '{}', payloadType: 'json' },
            path: 'message/saludo',
            workspaceId: 'events',
        });
    });

    it('does not write when the composer holds free text', async () => {
        composerEventsStore.getState().setPayload('alpha', 'hola');

        expect(await saveEventInComposer('alpha')).toBeNull();
        expect(writeItem).not.toHaveBeenCalled();
    });

    it('does not write when nothing was typed', async () => {
        composerEventsStore.getState().select('alpha', {
            eventName: 'saludo',
            eventResource: RESOURCE,
            payload: 'igual',
            payloadType: 'text',
            schema: '',
        });

        expect(await saveEventInComposer('alpha')).toBeNull();
        expect(writeItem).not.toHaveBeenCalled();
    });
});
