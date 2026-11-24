import type { RequestSendLog } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { sendLogOf, tellingSendLog } from '../../../../src/main/request/send-log.js';
import type { SendEvent } from '../../../../src/main/request/send-event.js';
import { failedSendOf, idOf, responseOf, sendOf } from '../history/history-fixture.js';

const SENT = { method: 'POST', url: 'http://localhost/pedidos', headers: [] };

describe('what the console is told of a send', () => {
    it('tells what left and what came back, with its time and its size', () => {
        const event = sendOf('/r', 1, {
            headers: [['User-Agent', 'Mozilla/5.0']],
            response: responseOf(null, [['content-type', 'application/json']]),
        });

        expect(sendLogOf(event)).toEqual({
            sendId: idOf(1),
            sent: { ...SENT, headers: [['User-Agent', 'Mozilla/5.0']] },
            answer: {
                status: 200,
                statusText: 'OK',
                totalMs: 2,
                bodyBytes: 1,
                headers: [['content-type', 'application/json']],
            },
        });
    });

    it('tells why nothing came back, in the words of the transport', () => {
        expect(sendLogOf(failedSendOf('/r', 2, 'request-unreachable'))).toEqual({
            sendId: idOf(2),
            sent: SENT,
            error: { code: 'request-unreachable', message: 'it failed' },
        });
    });

    it('tells a send that ended before anything was resolved without a request', () => {
        const event: SendEvent = {
            ...failedSendOf('/r', 3, 'script-failed'),
            sent: undefined,
        };

        expect(sendLogOf(event)).toEqual({
            sendId: idOf(3),
            error: { code: 'script-failed', message: 'it failed' },
        });
    });

    it('tells the window first and then hands the send to the next watcher', async () => {
        const order: string[] = [];
        const told: RequestSendLog[] = [];
        const observer = tellingSendLog(
            (log) => {
                order.push('told');
                told.push(log);
            },
            () => {
                order.push('next');

                return Promise.resolve();
            },
        );

        await observer(sendOf('/r', 4));

        expect(order).toEqual(['told', 'next']);
        expect(told[0]?.sendId).toBe(idOf(4));
    });
});
