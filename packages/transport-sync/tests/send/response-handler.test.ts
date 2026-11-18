import { describe, expect, it } from 'vitest';

import { RawResponseHandler } from '../../src/send/response-handler.js';

function controllerWith(rawHeaders: unknown): Parameters<RawResponseHandler['onResponseStart']>[0] {
    return { rawHeaders } as unknown as Parameters<RawResponseHandler['onResponseStart']>[0];
}

describe('RawResponseHandler', () => {
    it('flattens the raw header list of the controller into pairs, in order', () => {
        const handler = new RawResponseHandler();

        handler.onResponseStart(
            controllerWith(['set-cookie', 'a=1', 'set-cookie', 'b=2', 'x-one', 'first']),
            200,
            [],
            'OK',
        );

        expect(handler.head).toEqual({
            status: 200,
            statusText: 'OK',
            headers: [
                ['set-cookie', 'a=1'],
                ['set-cookie', 'b=2'],
                ['x-one', 'first'],
            ],
        });
    });

    it('answers with no headers when the controller carries none', () => {
        const handler = new RawResponseHandler();

        handler.onResponseStart(controllerWith(null), 404, [], 'Not Found');
        expect(handler.head.headers).toEqual([]);

        handler.onResponseStart(controllerWith(undefined), 500, [], 'Server Error');
        expect(handler.head.headers).toEqual([]);
    });

    it('keeps the status text empty when undici sends none', () => {
        const handler = new RawResponseHandler();

        handler.onResponseStart(controllerWith([]), 200, [], undefined);
        expect(handler.head.statusText).toBe('');
    });

    it('remembers the error a response ended with', () => {
        const handler = new RawResponseHandler();

        handler.onResponseError(controllerWith(null), new Error('socket died'));
        expect(handler.error?.message).toBe('socket died');
    });
});
