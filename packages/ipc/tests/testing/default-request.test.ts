import { createRequestItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { requestBodyReadResultSchema, requestSendResultSchema } from '../../src/index.js';
import { defaultRequest } from '../../src/testing/default-request.js';

const SEND_ID = '5b3c9b0e-6f0b-4b6a-9c1e-0c9c4f2d7a11';
const REF = 'a'.repeat(64);

describe('the request area a test gets when it says nothing about requests', () => {
    it('answers a send with a response its own channel accepts', async () => {
        const answer = await defaultRequest().send({
            sendId: SEND_ID,
            workspaceId: 'demo',
            itemPath: 'ping',
            environmentId: null,
            request: createRequestItem({ name: 'ping' }),
        });

        expect(requestSendResultSchema.safeParse(answer).success).toBe(true);
    });

    it('answers a window read with one its own channel accepts', async () => {
        const answer = await defaultRequest().readBody({ ref: REF, offset: 0, length: 1 });

        expect(requestBodyReadResultSchema.safeParse(answer).success).toBe(true);
    });

    it('cancels and saves with nothing to say', async () => {
        const area = defaultRequest();

        await expect(area.cancel({ sendId: SEND_ID })).resolves.toEqual({ ok: true, value: {} });
        await expect(area.saveBody({ ref: REF, suggestedName: 'x' })).resolves.toEqual({
            ok: true,
            value: { path: null },
        });
    });
});
