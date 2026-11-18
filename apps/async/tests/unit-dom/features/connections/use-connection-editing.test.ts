import { envStore } from '@mandor/env';
import { success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { createEnvironment } from '@mandor/schema';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { connectionsStore } from '../../../../src/renderer/features/connections/connections-store.js';
import { useConnectionEditing } from '../../../../src/renderer/features/connections/hooks/useConnectionEditing.js';
import { fakeConnection } from './support/fake-connections.js';

const CONNECTION = {
    ...fakeConnection('alpha', 'Echo'),
    url: 'ws://127.0.0.1:1',
} as never;
const ENVIRONMENT = createEnvironment({ id: 'local', name: 'local', variables: [] });
const SCOPE = { workspaceId: 'events' };

beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
    connectionsStore.getState().reset();
    envStore.getState().reset();
});

afterEach(() => {
    vi.useRealTimers();
});

function editing(connection: typeof CONNECTION = CONNECTION, scope: typeof SCOPE | null = SCOPE) {
    return renderHook(() =>
        useConnectionEditing({ connection, environments: [ENVIRONMENT], scope }),
    ).result;
}

describe('the connection edits, saved on their own', () => {
    it('travels the url to disk once the typing stops', async () => {
        const fakeBridge = window.mandor as FakeBridge;
        const update = vi
            .spyOn(fakeBridge.connection, 'update')
            .mockResolvedValue(success(fakeConnection('alpha', 'Echo')));
        const { current } = editing();

        current.onUrlChange('ws://127.0.0.1:2');

        expect(update).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(400);

        expect(update).toHaveBeenCalledWith({
            ...SCOPE,
            changes: { url: 'ws://127.0.0.1:2' },
            connectionId: 'alpha',
        });
    });

    it('travels the url and the description in their own pause', async () => {
        const fakeBridge = window.mandor as FakeBridge;
        const update = vi
            .spyOn(fakeBridge.connection, 'update')
            .mockResolvedValue(success(fakeConnection('alpha', 'Echo')));
        const { current } = editing();

        current.onUrlChange('ws://127.0.0.1:2');
        current.onDescriptionChange('nueva');

        await vi.advanceTimersByTimeAsync(400);

        expect(update).toHaveBeenCalledWith({
            ...SCOPE,
            changes: { url: 'ws://127.0.0.1:2', description: 'nueva' },
            connectionId: 'alpha',
        });
    });

    /** A live socket reopens against the environment, so the choice does not wait for a pause. */
    it('writes the chosen environment at once', async () => {
        const fakeBridge = window.mandor as FakeBridge;
        const update = vi
            .spyOn(fakeBridge.connection, 'update')
            .mockResolvedValue(success(fakeConnection('alpha', 'Echo')));
        const { current } = editing();

        current.onEnvironmentChange(ENVIRONMENT.id);
        await vi.advanceTimersByTimeAsync(0);

        expect(update).toHaveBeenCalledWith({
            ...SCOPE,
            changes: { environmentId: ENVIRONMENT.id },
            connectionId: 'alpha',
        });
    });

    it('writes nothing when the edit carries no change at all', async () => {
        const fakeBridge = window.mandor as FakeBridge;
        const update = vi.spyOn(fakeBridge.connection, 'update');
        const { current } = editing();

        current.onUrlChange('ws://127.0.0.1:1');
        current.onDescriptionChange('');

        await vi.advanceTimersByTimeAsync(400);

        expect(update).not.toHaveBeenCalled();
    });

    it('lands the failure on the connection when main refuses the write', async () => {
        const fakeBridge = window.mandor as FakeBridge;

        vi.spyOn(fakeBridge.connection, 'update').mockResolvedValue({
            ok: false,
            error: { code: 'fs-write', message: 'busy' },
        });
        const { current } = editing();

        current.onUrlChange('ws://127.0.0.1:2');

        await vi.advanceTimersByTimeAsync(400);

        expect(connectionsStore.getState().faults).toHaveProperty('alpha');
    });

    it('leaves the record alone without a workspace to write in', async () => {
        const fakeBridge = window.mandor as FakeBridge;
        const update = vi.spyOn(fakeBridge.connection, 'update');
        const { current } = editing(CONNECTION, null);

        current.onUrlChange('ws://127.0.0.1:2');

        await vi.advanceTimersByTimeAsync(400);

        expect(update).not.toHaveBeenCalled();
    });
});
