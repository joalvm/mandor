import { rememberSessionSecrets } from '@mandor/host';
import { forgetSecrets } from '@mandor/host/testing';
import { REDACTED } from '@mandor/vars';
import { afterEach, describe, expect, it } from 'vitest';

import { hideAnswer } from '../../../../src/main/request/hidden-answer.js';
import { httpResponseWith, textBody } from '../../../unit-dom/support/http-response.js';

afterEach(() => {
    forgetSecrets();
});

function hiddenValue(response: unknown) {
    const answer = hideAnswer(response);

    if (!answer.ok) {
        throw new Error('the response should be taken');
    }

    return answer.value;
}

describe('what a server answered, on its way to a file of the repo', () => {
    it('hides a short secret in the body, the status text and the values of headers and cookies', () => {
        rememberSessionSecrets(['123']);

        const answer = hiddenValue(
            httpResponseWith({
                body: textBody('{"pin":"123"}'),
                cookies: [
                    {
                        domain: '123.test',
                        httpOnly: false,
                        name: 'sid',
                        path: '/123',
                        secure: false,
                        value: '123',
                    },
                ],
                headers: [['x-echo', '123']],
                status: 200,
                statusText: 'code 123',
            }),
        );

        expect(answer.body).toMatchObject({ text: `{"pin":"${REDACTED}"}` });
        expect(answer.headers).toEqual([['x-echo', REDACTED]]);
        expect(answer.cookies).toMatchObject([
            { domain: `${REDACTED}.test`, name: 'sid', path: `/${REDACTED}`, value: REDACTED },
        ]);
        expect(answer.statusText).toBe(`code ${REDACTED}`);
        expect(answer.status).toBe(200);
    });

    it('hides a secret the server echoed in base64', () => {
        rememberSessionSecrets(['secret12']);

        expect(
            hiddenValue(httpResponseWith({ body: textBody('c2VjcmV0MTI=') })).body,
        ).toMatchObject({ text: REDACTED });
    });

    it('does not touch a name, or a body that is not text', () => {
        rememberSessionSecrets(['sid', 'AAAA']);

        const body = { data: 'AAAA', encoding: 'base64', kind: 'inline' };
        const answer = hiddenValue(
            httpResponseWith({
                body,
                cookies: [{ httpOnly: false, name: 'sid', secure: false, value: 'x' }],
                headers: [['sid', 'x']],
            }),
        );

        expect(answer.body).toEqual(body);
        expect(answer.headers).toEqual([['sid', 'x']]);
        expect(answer.cookies).toMatchObject([{ name: 'sid', value: 'x' }]);
    });

    it('takes an answer with no body as it is', () => {
        expect(hiddenValue(httpResponseWith({ body: null })).body).toBeNull();
    });

    it('refuses what is not a response', () => {
        expect(hideAnswer({ status: 'nope' })).toMatchObject({
            error: { code: 'bad-request' },
            ok: false,
        });
    });
});
