import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { checkedRequest } from '../../src/ipc/checked-request.js';

const schema = z.object({ name: z.string() });

describe('the request a renderer sent', () => {
    it('is handed on as the schema reads it', () => {
        expect(checkedRequest(schema, { name: 'a', extra: 1 })).toEqual({
            ok: true,
            value: { name: 'a' },
        });
    });

    it('is refused as a bad request when the schema does not read it', () => {
        const answer = checkedRequest(schema, { name: 3 });

        expect(answer.ok ? '' : answer.error.code).toBe('bad-request');
    });
});
