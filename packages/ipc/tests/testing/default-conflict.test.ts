import { describe, expect, it } from 'vitest';

import { conflictListResultSchema, conflictReadResultSchema } from '../../src/index.js';
import { defaultConflict } from '../../src/testing/default-conflict.js';

describe('the conflict area a test gets when it says nothing about clashes', () => {
    it('lists none, in the shape its own channel accepts', async () => {
        const answer = await defaultConflict(new Set()).list();

        expect(conflictListResultSchema.parse(answer)).toEqual({ ok: true, value: [] });
    });

    it('reads a clash with no questions, in the shape its own channel accepts', async () => {
        const answer = await defaultConflict(new Set()).read({ id: 'a' });

        expect(conflictReadResultSchema.safeParse(answer).success).toBe(true);
    });

    it('keeps the listeners of a change until they stop', () => {
        const handlers = new Set<(push: Record<string, never>) => void>();
        const stop = defaultConflict(handlers).onChanged(() => undefined);

        expect(handlers.size).toBe(1);
        stop();
        expect(handlers.size).toBe(0);
    });
});
