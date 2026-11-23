import type { ListedVariable } from '@mandor/env';
import type { RequestExample, ResponseBody } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import {
    answerOf,
    requestScriptContextOf,
    type RequestScriptPlace,
} from '../../../../../src/renderer/features/requests/lib/request-script-context.js';
import { IDLE_SEND } from '../../../../../src/renderer/features/requests/responses.slice.js';
import { responseOf } from '../../../main/history/history-fixture.js';

const TOKEN: ListedVariable = {
    name: 'token',
    origin: 'environment',
    secret: true,
    value: '••••••',
};

const PLACE: RequestScriptPlace = { variables: [TOKEN] };

function inline(text: string): ResponseBody {
    return { kind: 'inline', encoding: 'utf8', text };
}

function exampleOf(body: string): RequestExample {
    return { body, contentType: 'application/json', name: 'Ok', status: '200' };
}

describe('the context of the scripts of a place of Request', () => {
    it('lists the variables of the place as they were given, secrets already masked', () => {
        expect(requestScriptContextOf(PLACE).variables).toEqual([TOKEN]);
    });

    it('takes the answer of a send only once it came back', () => {
        const response = responseOf(inline('{}'));

        expect(answerOf({ state: 'done', response })).toBe(response);
        expect(answerOf(IDLE_SEND)).toBeUndefined();
    });

    it('names the headers it sends, switched on and named, once each', () => {
        const context = requestScriptContextOf({
            ...PLACE,
            headers: [
                { enabled: true, key: 'Authorization', value: 'Bearer x' },
                { enabled: false, key: 'X-Off', value: '1' },
                { enabled: true, key: '', value: 'nameless' },
                { enabled: true, key: 'Authorization', value: 'again' },
            ],
        });

        expect(context.headers).toEqual(['Authorization']);
        expect(requestScriptContextOf(PLACE).headers).toEqual([]);
    });

    it('reads the example somebody wrote down as the sample first', () => {
        const context = requestScriptContextOf({
            ...PLACE,
            example: exampleOf('{"from": "example"}'),
            response: responseOf(inline('{"from": "response"}')),
        });

        expect(context.sample).toEqual({ from: 'example' });
    });

    it('reads the last answer when there is no example that is JSON', () => {
        const context = requestScriptContextOf({
            ...PLACE,
            example: exampleOf('<html></html>'),
            response: responseOf(inline('{"from": "response"}')),
        });

        expect(context.sample).toEqual({ from: 'response' });
    });

    it('has no sample from an answer that is not text in memory', () => {
        const stored = responseOf({
            kind: 'stored',
            bytes: 9,
            contentType: 'application/json',
            ref: 'a'.repeat(64),
        });
        const binary = responseOf({ kind: 'inline', encoding: 'base64', data: 'e30=' });

        expect(requestScriptContextOf({ ...PLACE, response: stored }).sample).toBeUndefined();
        expect(requestScriptContextOf({ ...PLACE, response: binary }).sample).toBeUndefined();
        expect(
            requestScriptContextOf({ ...PLACE, response: responseOf(null) }).sample,
        ).toBeUndefined();
        expect(requestScriptContextOf(PLACE).sample).toBeUndefined();
    });
});
