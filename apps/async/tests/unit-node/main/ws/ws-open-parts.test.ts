import { describe, expect, it } from 'vitest';

import {
    handshakeHeaders,
    headersWithAuth,
    handshakeParams,
    templatesOf,
    urlWithAuthQuery,
} from '../../../../src/main/ws/ws-open-parts.js';

const TEMPLATE = {
    url: 'wss://echo.example/socket',
    headers: { 'X-Mine': '{{a}}' },
    params: [
        { key: 'page', value: '{{p}}', enabled: true },
        { key: 'off', value: 'x', enabled: false },
        { key: '', value: 'blank', enabled: true },
    ],
};

describe('the parts of a handshake', () => {
    it('names every template by key: the url, each header, each side of each param', () => {
        expect(templatesOf(TEMPLATE)).toEqual({
            url: 'wss://echo.example/socket',
            'header:X-Mine': '{{a}}',
            'param:0:key': 'page',
            'param:0:value': '{{p}}',
            'param:1:key': 'off',
            'param:1:value': 'x',
            'param:2:key': '',
            'param:2:value': 'blank',
        });
    });

    it('reads the headers and the params that are on back out of the resolved values', () => {
        const values = { 'header:X-Mine': '1', 'param:0:value': '2', url: 'wss://x' };

        expect(handshakeHeaders(values)).toEqual({ 'X-Mine': '1' });
        expect(handshakeParams(values, TEMPLATE)).toEqual([['page', '2']]);
    });

    it('lets a header the template wrote win over the auth, in any case', () => {
        expect(
            headersWithAuth({ authorization: 'mine' }, [
                ['Authorization', 'auth'],
                ['X-Key', 'k'],
            ]),
        ).toEqual({ 'X-Key': 'k', authorization: 'mine' });
    });

    it('appends the query to the url, and leaves a url with none as it was', () => {
        expect(urlWithAuthQuery('wss://echo.example/socket?a=1', [['b', '2']])).toBe(
            'wss://echo.example/socket?a=1&b=2',
        );
        expect(urlWithAuthQuery('wss://{{host}}', [])).toBe('wss://{{host}}');
    });
});
