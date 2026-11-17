import { describe, expect, it } from 'vitest';

import { headerValue } from '../../src/curl/curl-headers.js';
import { headerRowsOf } from '../../src/curl/curl-header-rows.js';
import type { CurlArg } from '../../src/curl/curl-args.js';

function arg(name: string, value: string): CurlArg {
    return { name, flag: `--${name}`, value };
}

function row(key: string, value: string) {
    return { key, value, enabled: true };
}

describe('the headers a curl command writes', () => {
    it('reads each header, in order, without the space after the colon', () => {
        expect(
            headerRowsOf([
                arg('header', 'Accept:   */*'),
                arg('header', 'X-Trace: a: b'),
                arg('header', 'X-Empty;'),
            ]),
        ).toEqual({
            rows: [row('Accept', '*/*'), row('X-Trace', 'a: b'), row('X-Empty', '')],
            notices: [],
        });
    });

    it('takes a header with nothing after the colon as a header curl removes', () => {
        expect(headerRowsOf([arg('header', 'Accept:')])).toEqual({ rows: [], notices: [] });
    });

    it('says a file of headers is not read', () => {
        expect(headerRowsOf([arg('header', '@headers.txt')]).notices).toEqual([
            { code: 'headerFile', subject: 'headers.txt' },
        ]);
    });

    it('says a header with no colon has no equivalent', () => {
        expect(headerRowsOf([arg('header', 'nonsense')])).toEqual({
            rows: [],
            notices: [{ code: 'unsupportedOption', subject: '--header' }],
        });
    });

    it('writes the user agent and the referer, and drops the ;auto of the referer', () => {
        expect(
            headerRowsOf([arg('user-agent', 'tool/1'), arg('referer', 'https://r;auto')]),
        ).toEqual({
            rows: [row('User-Agent', 'tool/1'), row('Referer', 'https://r')],
            notices: [],
        });
    });

    it('writes a cookie that has an equals sign and says a cookie file is not read', () => {
        expect(headerRowsOf([arg('cookie', 'a=1; b=2')]).rows).toEqual([row('Cookie', 'a=1; b=2')]);
        expect(headerRowsOf([arg('cookie', 'jar.txt')])).toEqual({
            rows: [],
            notices: [{ code: 'cookieFile', subject: 'jar.txt' }],
        });
    });

    it('joins a cookie to the one already written', () => {
        expect(headerRowsOf([arg('header', 'cookie: a=1'), arg('cookie', 'b=2')]).rows).toEqual([
            row('cookie', 'a=1; b=2'),
        ]);
    });

    it('leaves alone the options that are not headers', () => {
        expect(headerRowsOf([arg('data', 'x'), arg('location', '')])).toEqual({
            rows: [],
            notices: [],
        });
    });
});

describe('the value of a header', () => {
    it('finds the first one by name, whatever its case', () => {
        const rows = [row('X-A', '1'), row('Content-Type', 'a'), row('content-type', 'b')];

        expect(headerValue(rows, 'CONTENT-TYPE')).toBe('a');
        expect(headerValue(rows, 'accept')).toBeNull();
    });
});
