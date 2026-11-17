import { describe, expect, it } from 'vitest';

import { recordStatePushSchema } from '../../src/index.js';

describe('the push that carries the state of a recording', () => {
    it('names the connection, whether it writes, and how much the file holds', () => {
        const push = { active: true, connectionId: 'echo', entries: 12 };

        expect(recordStatePushSchema.parse(push)).toEqual(push);
    });

    it('refuses a push without the connection it talks about', () => {
        expect(recordStatePushSchema.safeParse({ active: true, entries: 0 }).success).toBe(false);
    });
});
