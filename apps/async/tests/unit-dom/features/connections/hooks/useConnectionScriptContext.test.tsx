import { envStore } from '@mandor/env';
import { createConnection, createEnvironment, type Connection } from '@mandor/schema';
import { originName } from '@mandor/shell';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { activityStore } from '../../../../../src/renderer/activity/activity-store.js';
import { useConnectionScriptContext } from '../../../../../src/renderer/features/connections/hooks/useConnectionScriptContext.js';
import { connectionResource } from '../../../../../src/renderer/features/connections/lib/connection-resource.js';
import { messageEntry } from '../../../../../src/renderer/features/connections/lib/connection-message-entry.js';

const STAGING = {
    ...createEnvironment({ id: 'staging', name: 'Staging' }),
    variables: [{ enabled: true, name: 'token', secret: true, value: 'a-very-long-secret' }],
};

const CONNECTION: Connection = {
    ...createConnection({ id: 'alpha', name: 'Gateway', url: 'ws://localhost:3000' }),
    environmentId: 'staging',
    headers: [{ enabled: true, key: 'Authorization', value: 'Bearer {{token}}' }],
    scripts: { onMessage: { source: 'mandor.variables.set("ticket", 1);' } },
};

function received(data: string, direction: 'in' | 'out' = 'in'): void {
    act(() => {
        activityStore
            .getState()
            .appendActivity(connectionResource(originName(), 'events', 'alpha'), [
                messageEntry({ at: 1, data, direction }),
            ]);
    });
}

afterEach(() => {
    cleanup();
    activityStore.getState().reset();
    envStore.getState().reset();
});

describe('what the editors of the scripts of a connection know', () => {
    it('lists its environment, secrets masked, what its scripts declare and its handshake headers', () => {
        const { result } = renderHook(() =>
            useConnectionScriptContext(CONNECTION, STAGING, 'events'),
        );

        expect(result.current.variables).toEqual([
            { name: 'token', origin: 'environment', secret: true, value: '••••••••••••••' },
            { name: 'ticket', origin: 'script', secret: false, value: '' },
        ]);
        expect(JSON.stringify(result.current)).not.toContain('a-very-long-secret');
        expect(result.current.headers).toEqual(['Authorization']);
    });

    it('reads the last frame it received as the sample, and a frame sent changes nothing', () => {
        const { result } = renderHook(() =>
            useConnectionScriptContext(CONNECTION, STAGING, 'events'),
        );

        expect(result.current.sample).toBeUndefined();

        received('{"order": {"id": 7}}');

        expect(result.current.sample).toEqual({ order: { id: 7 } });

        const known = result.current;

        received('{"sent": true}', 'out');

        expect(result.current).toBe(known);
    });
});
