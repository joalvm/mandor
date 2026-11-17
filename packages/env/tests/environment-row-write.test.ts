import { success } from '@mandor/ipc';
import { createEnvironment } from '@mandor/schema';
import { bridge } from '@mandor/shell';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { scheduleRowWrite } from '../src/lib/environment-row-write.js';
import { GLOBALS_ROW } from '../src/lib/globals-row.js';
import { flushPendingEnvironmentWrites } from '../src/lib/pending-environment-write.js';
import { flushPendingGlobalsWrite } from '../src/lib/pending-globals-write.js';

const HOST = { name: 'host', value: 'api.local', enabled: true, secret: false };

afterEach(async () => {
    await flushPendingGlobalsWrite();
    await flushPendingEnvironmentWrites('pagos');
});

describe('scheduleRowWrite', () => {
    it('writes the globals row as the globals of the origin', async () => {
        const write = vi.spyOn(bridge.globals, 'write');

        scheduleRowWrite('pagos', { id: GLOBALS_ROW, name: 'Globals', variables: [HOST] });
        await flushPendingGlobalsWrite();

        expect(write).toHaveBeenCalledWith({ globals: { variables: [HOST] } });
    });

    it('writes an environment row as the file of its workspace', async () => {
        const update = vi
            .spyOn(bridge.environment, 'update')
            .mockResolvedValue(success(createEnvironment({ id: 'local', name: 'Local' })));

        scheduleRowWrite(
            'pagos',
            createEnvironment({ id: 'local', name: 'Local', variables: [HOST] }),
        );
        await flushPendingEnvironmentWrites('pagos');

        expect(update).toHaveBeenCalledWith({
            workspaceId: 'pagos',
            environmentId: 'local',
            changes: { name: 'Local', variables: [HOST] },
        });
    });
});
