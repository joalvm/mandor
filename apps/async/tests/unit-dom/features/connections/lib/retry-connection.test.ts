import { failure } from '@mandor/ipc';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../../src/renderer/app/async-bridge.js';
import {
    connectionsStore,
    selectFaultFor,
} from '../../../../../src/renderer/features/connections/index.js';
import { retryConnectionNow } from '../../../../../src/renderer/features/connections/lib/retry-connection.js';

beforeEach(() => {
    connectionsStore.getState().reset();
});

describe('retrying a connection now', () => {
    it('asks the asyncBridge to retry the connection it names', async () => {
        const retryNow = vi.spyOn(asyncBridge.ws, 'retryNow');

        await retryConnectionNow('gateway');

        expect(retryNow).toHaveBeenCalledWith({ connectionId: 'gateway' });
    });

    it('reports the code when the asyncBridge refuses', async () => {
        vi.spyOn(asyncBridge.ws, 'retryNow').mockResolvedValue(
            failure('unknown', 'no pending retry'),
        );

        await retryConnectionNow('gateway');

        expect(selectFaultFor('gateway')(connectionsStore.getState())?.code).toBe('unknown');
    });
});
