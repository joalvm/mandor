import { success } from '@mandor/ipc';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { activityStore } from '../../../../../src/renderer/activity/activity-store.js';
import { asyncBridge } from '../../../../../src/renderer/app/async-bridge.js';
import { composerEventsStore } from '../../../../../src/renderer/events/composer-events-store.js';
import { releaseConnection } from '../../../../../src/renderer/features/connections/lib/release-connection.js';

const RESOURCE = 'mandor://local-apis/events/connection/echo';

beforeEach(() => {
    vi.restoreAllMocks();
    activityStore.getState().reset();
    composerEventsStore.getState().reset();
});

describe('letting go of a connection when its view closes', () => {
    it('closes the socket of the connection in main', () => {
        const close = vi.spyOn(asyncBridge.ws, 'close').mockResolvedValue(success({}));

        releaseConnection('echo', RESOURCE);

        expect(close).toHaveBeenCalledWith({ connectionId: 'echo' });
    });

    it('drops the frames that came through it', () => {
        vi.spyOn(asyncBridge.ws, 'close').mockResolvedValue(success({}));
        activityStore
            .getState()
            .appendActivity(RESOURCE, [
                { at: 1, bytes: 0, detail: { at: 1, code: 'unknown' }, kind: 'connection-fault' },
            ]);

        releaseConnection('echo', RESOURCE);

        expect(activityStore.getState().entries[RESOURCE]).toBeUndefined();
    });

    it('drops the event its composer held', () => {
        vi.spyOn(asyncBridge.ws, 'close').mockResolvedValue(success({}));
        composerEventsStore.getState().select('echo', {
            eventName: 'ping',
            eventResource: '',
            payload: '{}',
            payloadType: 'json',
            schema: '',
        });

        releaseConnection('echo', RESOURCE);

        expect(composerEventsStore.getState().byConnection['echo']).toBeUndefined();
    });

    it('leaves the buffer of another connection as it was', () => {
        vi.spyOn(asyncBridge.ws, 'close').mockResolvedValue(success({}));
        const other = 'mandor://local-apis/events/connection/other';

        activityStore
            .getState()
            .appendActivity(other, [
                { at: 1, bytes: 0, detail: { at: 1, code: 'unknown' }, kind: 'connection-fault' },
            ]);

        releaseConnection('echo', RESOURCE);

        expect(activityStore.getState().entries[other]).toHaveLength(1);
    });
});
