import { failure, success } from '@mandor/ipc';
import { createConnection } from '@mandor/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../../src/renderer/app/async-bridge.js';
import { connectionHeld } from '../../../../../src/renderer/features/connections/lib/connection-held.js';

const ECHO = createConnection({ id: 'ws-echo', name: 'Ws echo', url: 'wss://ejemplo.test' });

beforeEach(() => {
    vi.restoreAllMocks();
});

describe('whether a workspace holds the connection a link names', () => {
    it('asks main for the connections of that workspace and finds it by id', async () => {
        const list = vi.spyOn(asyncBridge.connection, 'list').mockResolvedValue(success([ECHO]));

        await expect(connectionHeld('events', ECHO.id)).resolves.toBe(true);
        await expect(connectionHeld('events', 'gone')).resolves.toBe(false);
        expect(list).toHaveBeenCalledWith({ workspaceId: 'events' });
    });

    /** A list main could not read holds nothing a link could open. */
    it('holds nothing when main refuses the list', async () => {
        vi.spyOn(asyncBridge.connection, 'list').mockResolvedValue(
            failure('fs-read', 'unreadable'),
        );

        await expect(connectionHeld('events', ECHO.id)).resolves.toBe(false);
    });
});
