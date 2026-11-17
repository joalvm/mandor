import { describe, expect, it } from 'vitest';

import { requestSendRequestSchema, requestSendResultSchema } from '../../src/index.js';

const SEND_ID = '5b3c9b0e-6f0b-4b6a-9c1e-0c9c4f2d7a11';

const send = {
    sendId: SEND_ID,
    workspaceId: 'payments',
    itemPath: 'orders/create',
    environmentId: 'staging',
    request: { name: 'create order', url: '{{baseUrl}}/orders', method: 'POST' },
};

describe('the request of request:send', () => {
    it('takes the request as it is on screen, templates included', () => {
        const parsed = requestSendRequestSchema.parse(send);

        expect(parsed.request.url).toBe('{{baseUrl}}/orders');
        expect(parsed.sendId).toBe(SEND_ID);
    });

    it('takes a send that skips its scripts, and only a yes or a no for it', () => {
        expect(requestSendRequestSchema.parse({ ...send, skipScripts: true }).skipScripts).toBe(
            true,
        );
        expect(requestSendRequestSchema.parse(send).skipScripts).toBeUndefined();
        expect(requestSendRequestSchema.safeParse({ ...send, skipScripts: 'yes' }).success).toBe(
            false,
        );
    });

    it('takes no environment at all', () => {
        expect(requestSendRequestSchema.parse({ ...send, environmentId: null }).environmentId).toBe(
            null,
        );
    });

    it('refuses a send id that is not a uuid', () => {
        expect(requestSendRequestSchema.safeParse({ ...send, sendId: 'one' }).success).toBe(false);
    });

    it('refuses an item path that climbs out of the collection', () => {
        expect(requestSendRequestSchema.safeParse({ ...send, itemPath: '../x' }).success).toBe(
            false,
        );
    });

    it('refuses what it does not know: the resolved url never comes from the renderer', () => {
        expect(
            requestSendRequestSchema.safeParse({ ...send, resolvedUrl: 'http://x' }).success,
        ).toBe(false);
    });
});

describe('the answer of request:send', () => {
    it('is a failure the interface can name by its code', () => {
        const answer = { ok: false, error: { code: 'request-timeout', message: 'slow' } };

        expect(requestSendResultSchema.parse(answer)).toEqual(answer);
    });
});
