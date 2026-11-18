import { success } from '@mandor/ipc';
import type { Connection } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../../src/renderer/app/async-bridge.js';
import {
    scheduleConnectionWrite,
    settlePendingConnectionWrites,
} from '../../../../../src/renderer/features/connections/lib/pending-connection-write.js';
import type { WorkspaceScope } from '../../../../../src/renderer/features/connections/lib/workspace-scope.js';

const SCOPE: WorkspaceScope = { workspaceId: 'payments' };

const CONNECTION: Connection = {
    id: 'alpha',
    name: 'Alpha',
    transport: 'websocket',
    url: 'ws://example.test/alpha',
    headers: [],
    environmentId: null,
};

beforeEach(() => {
    vi.restoreAllMocks();
});

afterEach(async () => {
    await settlePendingConnectionWrites();
});

describe('the write a connection still owes the disk', () => {
    it('travels to main when it is settled, before the pause is over', async () => {
        const update = vi
            .spyOn(asyncBridge.connection, 'update')
            .mockResolvedValue(success(CONNECTION));

        scheduleConnectionWrite(SCOPE, CONNECTION, { url: 'ws://example.test/moved' });

        expect(update).not.toHaveBeenCalled();

        await settlePendingConnectionWrites();

        expect(update).toHaveBeenCalledWith({
            workspaceId: 'payments',
            connectionId: 'alpha',
            changes: { url: 'ws://example.test/moved' },
        });
    });

    it('carries every change the pause gathered, not only the last one', async () => {
        const update = vi
            .spyOn(asyncBridge.connection, 'update')
            .mockResolvedValue(success(CONNECTION));

        scheduleConnectionWrite(SCOPE, CONNECTION, { url: 'ws://example.test/moved' });
        scheduleConnectionWrite(SCOPE, CONNECTION, { description: '# Eco' });
        await settlePendingConnectionWrites();

        expect(update).toHaveBeenCalledOnce();
        expect(update).toHaveBeenCalledWith({
            workspaceId: 'payments',
            connectionId: 'alpha',
            changes: { url: 'ws://example.test/moved', description: '# Eco' },
        });
    });

    it('says a connection left without scripts as null, the one value main can clear them by', async () => {
        const update = vi
            .spyOn(asyncBridge.connection, 'update')
            .mockResolvedValue(success(CONNECTION));

        scheduleConnectionWrite(SCOPE, CONNECTION, { scripts: undefined });
        await settlePendingConnectionWrites();

        expect(update).toHaveBeenCalledWith({
            workspaceId: 'payments',
            connectionId: 'alpha',
            changes: { scripts: null },
        });
    });

    it('spends nothing when there is nothing pending', async () => {
        const update = vi.spyOn(asyncBridge.connection, 'update');

        await settlePendingConnectionWrites();

        expect(update).not.toHaveBeenCalled();
    });
});
