import { describe, expect, it } from 'vitest';

import { requestSendLogSchema, SEND_LOG_BODY_MAX } from '../../src/index.js';

const sent = {
    method: 'POST',
    url: 'http://localhost:81/session',
    headers: [['User-Agent', 'Mozilla/5.0']],
};

const push = {
    sendId: '5b3c9b0e-6f0b-4b6a-9c1e-0c9c4f2d7a11',
    sent,
    answer: {
        status: 201,
        statusText: 'Created',
        totalMs: 120,
        bodyBytes: 1200,
        headers: [['content-type', 'application/json']],
    },
};

describe('the push of request:send-log', () => {
    it('carries what left and what came back', () => {
        expect(requestSendLogSchema.parse(push)).toEqual(push);
    });

    it('carries why nothing came back, with or without a request that left', () => {
        const error = { code: 'request-unreachable', message: 'getaddrinfo ENOTFOUND api' };

        expect(requestSendLogSchema.parse({ sendId: push.sendId, sent, error })).toEqual({
            sendId: push.sendId,
            sent,
            error,
        });
        expect(requestSendLogSchema.safeParse({ sendId: push.sendId, error }).success).toBe(true);
    });

    it('carries the bodies that read as text, and refuses one past the ceiling', () => {
        const bodies = {
            ...push,
            sent: { ...sent, body: '{"a":1}' },
            answer: { ...push.answer, body: '{"id":7}' },
        };
        const swollen = { ...push, sent: { ...sent, body: 'x'.repeat(SEND_LOG_BODY_MAX + 1) } };

        expect(requestSendLogSchema.parse(bodies)).toEqual(bodies);
        expect(requestSendLogSchema.safeParse(swollen).success).toBe(false);
    });

    it('refuses a code that is not an error of the contract', () => {
        expect(
            requestSendLogSchema.safeParse({
                sendId: push.sendId,
                error: { code: 'nope', message: '' },
            }).success,
        ).toBe(false);
    });

    it('refuses a push of no send and a field it does not know', () => {
        expect(requestSendLogSchema.safeParse({ ...push, sendId: 'x' }).success).toBe(false);
        expect(requestSendLogSchema.safeParse({ ...push, extra: 1 }).success).toBe(false);
    });
});
