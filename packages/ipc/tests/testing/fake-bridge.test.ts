import { originSchema } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { failure } from '../../src/index.js';
import { createFakeBridge } from '../../src/testing/fake-bridge.js';

describe('the fake bridge', () => {
    it('answers with domain data that passes its own schema', async () => {
        const bridge = createFakeBridge();
        const result = await bridge.origin.list();

        expect(result.ok).toBe(true);

        if (result.ok) {
            expect(() => result.value.map((origin) => originSchema.parse(origin))).not.toThrow();
        }
    });

    it('lets a test replace one method and keep the rest', async () => {
        const bridge = createFakeBridge({
            ws: { open: () => Promise.resolve(failure('ws-open-failed', 'refused')) },
        });
        const opened = await bridge.ws.open({
            connectionId: 'gateway',
            workspaceId: 'payments',
            environmentId: null,
            transport: 'websocket',
            template: { url: 'ws://echo.local' },
        });
        const listed = await bridge.origin.list();

        expect(opened).toEqual({
            ok: false,
            error: { code: 'ws-open-failed', message: 'refused' },
        });
        expect(listed).toEqual({
            ok: true,
            value: [{ id: 'local', kind: 'local', name: 'Local' }],
        });
    });

    it('pushes state and activity to subscribers until they unsubscribe', () => {
        const bridge = createFakeBridge();
        const states: string[] = [];
        const batches: number[] = [];

        const offState = bridge.ws.onState((push) => {
            states.push(push.state);
        });
        const offActivity = bridge.ws.onActivity((push) => {
            batches.push(push.records.length);
        });

        bridge.emitState({ connectionId: 'gateway', state: 'open' });
        bridge.emitActivity({
            connectionId: 'gateway',
            environmentId: null,
            records: [{ direction: 'in', data: 'hola', at: 1_700_000_000_000 }],
        });

        offState();
        offActivity();

        bridge.emitState({ connectionId: 'gateway', state: 'closed' });

        expect(states).toEqual(['open']);
        expect(batches).toEqual([1]);
    });
});
