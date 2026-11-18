import { describe, expect, it } from 'vitest';

import { methodOf } from '../../src/curl/curl-method.js';
import type { CurlArg } from '../../src/curl/curl-args.js';

function arg(name: string, value: string | null = null): CurlArg {
    return {
        name,
        flag: `--${name}`,
        value,
    };
}

describe('the method of a curl command', () => {
    it('is GET with nothing else, and POST with a body', () => {
        expect(methodOf([], false)).toEqual({ method: 'GET', notices: [] });
        expect(methodOf([], true)).toEqual({ method: 'POST', notices: [] });
    });

    it('is the one -X names, in upper case, and the last one wins', () => {
        expect(methodOf([arg('request', 'put')], true).method).toBe('PUT');
        expect(methodOf([arg('request', 'PUT'), arg('request', 'delete')], false).method).toBe(
            'DELETE',
        );
    });

    it('is HEAD with -I, and GET with -G, unless -X says another', () => {
        expect(methodOf([arg('head')], false).method).toBe('HEAD');
        expect(methodOf([arg('get')], true).method).toBe('GET');
        expect(methodOf([arg('head'), arg('request', 'PATCH')], false).method).toBe('PATCH');
    });

    it('ignores a method that is not a token and says so', () => {
        expect(methodOf([arg('request', 'GE T')], true)).toEqual({
            method: 'POST',
            notices: [{ code: 'unsupportedOption', subject: '--request' }],
        });
    });
});
