import { describe, expect, it } from 'vitest';

import { historyListResultSchema, historyReadResultSchema } from '../../src/index.js';
import { defaultHistory } from '../../src/testing/default-history.js';
import { createFakeBridge } from '../../src/testing/fake-bridge.js';

const ID = '5b3c9b0e-6f0b-4b6a-9c1e-0c9c4f2d7a11';

describe('the history area a test gets when it says nothing about the history', () => {
    it('lists nothing, in the shape its own channel accepts', async () => {
        const answer = await defaultHistory().list({ workspaceId: 'demo' });

        expect(historyListResultSchema.parse(answer)).toEqual({
            ok: true,
            value: { entries: [] },
        });
    });

    it('reads an entry its own channel accepts', async () => {
        const answer = await defaultHistory().read({ workspaceId: 'demo', id: ID });

        expect(historyReadResultSchema.safeParse(answer).success).toBe(true);
    });

    it('deletes with nothing to say', async () => {
        await expect(defaultHistory().remove({ workspaceId: 'demo', all: true })).resolves.toEqual({
            ok: true,
            value: {},
        });
    });

    it('never announces anything, and its unsubscribe is harmless', () => {
        const off = defaultHistory().onAppended(() => {
            throw new Error('nothing should be pushed');
        });

        expect(() => {
            off();
        }).not.toThrow();
    });

    it('is the history of the fake bridge, until a test replaces a method', async () => {
        const bridge = createFakeBridge({
            history: {
                remove: () => Promise.resolve({ ok: true, value: {} }),
            },
        });

        await expect(bridge.history.list({ workspaceId: 'demo' })).resolves.toEqual({
            ok: true,
            value: { entries: [] },
        });
    });
});
