import { describe, expect, it } from 'vitest';

import { curlArgs } from '../../src/curl/curl-args.js';
import { CurlParseError } from '../../src/curl/curl-parse-error.js';

describe('the options of a curl command', () => {
    it('reads a cluster of letters one by one', () => {
        expect(curlArgs(['-sSL', 'https://h']).options).toEqual([
            { name: 'location', flag: '-L', value: null },
        ]);
    });

    it('reads the value glued to its letter', () => {
        expect(curlArgs(['-XPOST', '-d@f']).options).toEqual([
            { name: 'request', flag: '-X', value: 'POST' },
            { name: 'data', flag: '-d', value: '@f' },
        ]);
    });

    it('reads the value from the next word when nothing is glued', () => {
        expect(curlArgs(['-H', 'A: b', '--header', 'C: d']).options).toEqual([
            { name: 'header', flag: '-H', value: 'A: b' },
            { name: 'header', flag: '--header', value: 'C: d' },
        ]);
    });

    it('stops a cluster at the letter that takes a value', () => {
        expect(curlArgs(['-kXPOST']).options).toEqual([
            { name: 'insecure', flag: '-k', value: null },
            { name: 'request', flag: '-X', value: 'POST' },
        ]);
    });

    it('refuses an option with no value', () => {
        expect(() => curlArgs(['-H'])).toThrow(CurlParseError);
        expect(() => curlArgs(['--data'])).toThrow(/missingArgument/);
        expect(() => curlArgs(['-H'])).toThrow(expect.objectContaining({ subject: '-H' }));
    });

    it('reads --name=value as the option, at the first equals sign', () => {
        const read = curlArgs(['--header=a=b', '--location=1', '--silent=1', 'https://h']);

        expect(read.options).toEqual([
            { name: 'header', flag: '--header', value: 'a=b' },
            { name: 'location', flag: '--location', value: null },
        ]);
        expect(read.notices).toEqual([]);
        expect(read.urls).toEqual(['https://h']);
    });

    it('names a --name=value it does not know, and keeps the next word', () => {
        const read = curlArgs(['--nonsense=a', '--other', 'https://h']);

        expect(read.notices).toEqual([
            { code: 'unknownOption', subject: '--nonsense=a' },
            { code: 'unknownOption', subject: '--other' },
        ]);
        expect(read.urls).toEqual(['https://h']);
    });

    it('takes every word after -- for a URL, and skips a blank one', () => {
        const read = curlArgs(['-s', ' ', '--', '-a', ' ', 'https://h']);

        expect(read.notices).toEqual([]);
        expect(read.options).toEqual([]);
        expect(read.urls).toEqual(['-a', 'https://h']);
    });

    it('takes the escapes off a field and leaves the data as it came', () => {
        const read = curlArgs(['-H', 'a: 1\\&2', '-d', 'b\\&c', 'https://h']);

        expect(read.options).toEqual([
            { name: 'header', flag: '-H', value: 'a: 1&2' },
            { name: 'data', flag: '-d', value: 'b\\&c' },
        ]);
    });

    it('names an unknown letter and an alone dash', () => {
        expect(curlArgs(['-W', '-']).notices).toEqual([
            { code: 'unknownOption', subject: '-W' },
            { code: 'unknownOption', subject: '-' },
        ]);
    });

    it('lets pass what changes nothing, with its value', () => {
        const read = curlArgs(['-s', '-o', 'out.txt', '--compressed', 'https://h']);

        expect(read.options).toEqual([]);
        expect(read.notices).toEqual([]);
        expect(read.urls).toEqual(['https://h']);
    });

    it('says what it cannot keep and consumes its value', () => {
        const read = curlArgs(['-x', 'http://p:1', 'https://h']);

        expect(read.notices).toEqual([{ code: 'unsupportedOption', subject: '-x' }]);
        expect(read.urls).toEqual(['https://h']);
    });

    it('collects the URLs in the order they come, --url included', () => {
        expect(curlArgs(['https://a', '--url', 'https://b', 'https://c']).urls).toEqual([
            'https://a',
            'https://b',
            'https://c',
        ]);
    });
});
