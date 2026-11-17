import type { RequestExample } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import {
    expectedCookiesOf,
    expectedHeadersOf,
    linesOfPairs,
    pairsOfLines,
    samePairs,
    withExpectedCookies,
    withExpectedHeaders,
} from '../../../../../src/renderer/features/requests/lib/expected-lines.js';

const EXAMPLE: RequestExample = {
    body: '',
    contentType: 'text/plain',
    name: 'Creado',
    status: '200',
};

describe('what an example declares, as pairs (expected-lines)', () => {
    it('reads no pairs from an example that declares nothing', () => {
        expect(expectedHeadersOf(EXAMPLE)).toEqual([]);
        expect(expectedCookiesOf(EXAMPLE)).toEqual([]);
    });

    it('writes headers, and leaves the key out when none is left', () => {
        const written = withExpectedHeaders(EXAMPLE, [['x-a', '1']]);

        expect(expectedHeadersOf(written)).toEqual([['x-a', '1']]);
        expect(withExpectedHeaders(written, [])).toEqual(EXAMPLE);
    });

    it('keeps the attributes of a cookie under its name', () => {
        const example: RequestExample = {
            ...EXAMPLE,
            cookies: [
                { domain: 'a.test', httpOnly: true, name: 'sid', secure: true, value: 'old' },
            ],
        };
        const written = withExpectedCookies(example, [
            ['sid', 'new'],
            ['theme', 'dark'],
        ]);

        expect(written.cookies).toEqual([
            { domain: 'a.test', httpOnly: true, name: 'sid', secure: true, value: 'new' },
            { httpOnly: false, name: 'theme', secure: false, value: 'dark' },
        ]);
        expect(expectedCookiesOf(written)).toEqual([
            ['sid', 'new'],
            ['theme', 'dark'],
        ]);
    });

    it('leaves the cookies out when none is left', () => {
        const written = withExpectedCookies(EXAMPLE, [['sid', '1']]);

        expect(withExpectedCookies(written, [])).toEqual(EXAMPLE);
    });

    it('turns pairs into lines and back', () => {
        const lines = linesOfPairs([
            ['x-a', '1'],
            ['x-a', '2'],
        ]);

        expect(lines.map((line) => line.id)).toEqual(['0', '1']);
        expect(pairsOfLines(lines)).toEqual([
            ['x-a', '1'],
            ['x-a', '2'],
        ]);
    });

    it('keeps a line with no name out of the example', () => {
        const lines = [{ disabled: false, id: '0', name: '  ', value: '1' }];

        expect(pairsOfLines(lines)).toEqual([]);
    });

    it('tells two lists of pairs apart', () => {
        expect(samePairs([['a', '1']], [['a', '1']])).toBe(true);
        expect(samePairs([['a', '1']], [['a', '2']])).toBe(false);
        expect(samePairs([['a', '1']], [['b', '1']])).toBe(false);
        expect(samePairs([['a', '1']], [])).toBe(false);
    });
});
