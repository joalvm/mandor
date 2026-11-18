import { describe, expect, it } from 'vitest';

import { parsedOf, row } from './parsed-of.js';

const URL_AND_QUERY = {
    url: 'https://api.test/v1/a',
    query: [row('x', '1'), row('y', '2')],
};

describe('a curl command as it really gets pasted', () => {
    it.each([
        [
            'a space after the line break backslash',
            "curl \\ \n 'https://api.test/v1/a?x=1&y=2' \\  ",
        ],
        ['a command flattened to one line', "curl -L \\ 'https://api.test/v1/a?x=1&y=2' \\ -s"],
        ['a final backslash', "curl 'https://api.test/v1/a?x=1&y=2' \\"],
        ['the caret lines of cmd', 'curl "https://api.test/v1/a?x=1&y=2" ^\r\n  -s'],
        ['the carets of Chrome for cmd', 'curl ^"https://api.test/v1/a?x=1^&y=2^" ^\r\n  -s'],
        ['the backtick lines of PowerShell', 'curl.exe "https://api.test/v1/a?x=1&y=2" `\n  -s'],
        ['an ampersand escaped in double quotes', 'curl "https://api.test/v1/a?x=1\\&y=2"'],
        ['an ampersand escaped in single quotes', "curl 'https://api.test/v1/a?x=1\\&y=2'"],
        ['a query cut across double quoted lines', 'curl "https://api.test/v1/a?\\\nx=1&\\\ny=2"'],
        ['a query cut across single quoted lines', "curl 'https://api.test/v1/a?\\\nx=1&\\\ny=2'"],
        ['escaped slashes', 'curl "https:\\/\\/api.test\\/v1\\/a?x=1&y=2"'],
        ['a shell prompt', "$ curl 'https://api.test/v1/a?x=1&y=2'"],
        ['a code fence', "```bash\ncurl 'https://api.test/v1/a?x=1&y=2'\n```"],
        ['a line before it', "# the thing\nexport A=1\ncurl 'https://api.test/v1/a?x=1&y=2'"],
        ['sudo and a variable first', "sudo A=1 curl 'https://api.test/v1/a?x=1&y=2'"],
        ['curly double quotes', 'curl \u201chttps://api.test/v1/a?x=1&y=2\u201d'],
        ['curly single quotes', 'curl \u2018https://api.test/v1/a?x=1&y=2\u2019'],
        ['no-break spaces', "curl\u00a0'https://api.test/v1/a?x=1&y=2'\u00a0-s"],
        ['--url=value', "curl --url='https://api.test/v1/a?x=1&y=2'"],
        [
            'a word of an option nobody knows first',
            "curl --new-thing abc 'https://api.test/v1/a?x=1&y=2'",
        ],
        ['the end of the options', "curl -s -- 'https://api.test/v1/a?x=1&y=2'"],
    ])('finds the url and the params through %s', (_name, text) => {
        expect(parsedOf(text).request).toMatchObject(URL_AND_QUERY);
    });

    it('reads a whole Chrome copy for cmd: headers and body without one caret', () => {
        const text = [
            'curl ^"https://api.test/v1/a?x=1^&y=2^" ^',
            '  -H ^"accept: application/json^" ^',
            '  -H ^"x-range: 10^%^" ^',
            '  --data-raw ^"^{^\\^"a^\\^":^\\^"b c^\\^"^}^"',
        ].join('\r\n');

        const { request, notices } = parsedOf(text);

        expect(notices).toEqual([]);
        expect(request).toMatchObject({
            ...URL_AND_QUERY,
            method: 'POST',
            body: { type: 'text', content: '{"a":"b c"}' },
        });
        expect(request.headers).toEqual(
            expect.arrayContaining([row('accept', 'application/json'), row('x-range', '10%')]),
        );
    });

    it('keeps a line break of a value Chrome wrote for cmd', () => {
        const text =
            'curl ^"https://api.test^" --data-raw ^"a^\n\nb^" -H ^"content-type: text/plain^"';

        expect(parsedOf(text).request.body).toEqual({ type: 'text', content: 'a\nb' });
    });

    it('does not take a dollar of cmd for a variable', () => {
        expect(parsedOf('curl ^"https://api.test?^$top=1^" ^\n  -s').request.query).toEqual([
            row('$top', '1'),
        ]);
    });

    it('reads the --name=value of the other options too', () => {
        expect(
            parsedOf("curl https://api.test --request=PUT --header='a: b' --data-raw='c=d'")
                .request,
        ).toMatchObject({
            method: 'PUT',
            headers: [row('a', 'b')],
            body: { type: 'urlencoded', fields: [row('c', 'd')] },
        });
    });

    it('cleans the escapes of the headers, the auth and the query of -G', () => {
        expect(
            parsedOf(
                "curl -G https://api.test -d 'q=a\\&r=b' -H 'x-a: 1\\&2\\=3' -u 'ana:p\\&q' -A 'ua\\;1'",
            ).request,
        ).toMatchObject({
            query: [row('q', 'a'), row('r', 'b')],
            headers: [row('x-a', '1&2=3'), row('User-Agent', 'ua;1')],
            auth: { type: 'basic', username: 'ana', password: 'p&q' },
        });
    });

    it('never touches what a backslash means inside a body or a value', () => {
        const { request } = parsedOf(
            'curl \'https://api.test?p=C:\\temp\' -H \'x-j: {"a":"b\\"c"}\' ' +
                '-H \'content-type: application/json\' -d \'{"a":"b\\&c\\n"}\'',
        );

        expect(request.query).toEqual([row('p', 'C:\\temp')]);
        expect(request.headers).toContainEqual(row('x-j', '{"a":"b\\"c"}'));
        expect(request.body).toEqual({ type: 'json', content: '{"a":"b\\&c\\n"}' });
    });

    it('leaves the curly quotes and the dashes of a text between straight quotes', () => {
        const { request } = parsedOf(
            "curl https://api.test -H 'content-type: text/plain' -d 'l\u2019eau \u2013 \u201cok\u201d\u00a0'",
        );

        expect(request.body).toEqual({
            type: 'text',
            content: 'l\u2019eau \u2013 \u201cok\u201d\u00a0',
        });
    });

    it('reads the dashes a word processor makes of an option', () => {
        expect(
            parsedOf("curl \u2013\u2013location https://api.test \u2014header 'a: b' \u2013X PUT")
                .request,
        ).toMatchObject({
            method: 'PUT',
            url: 'https://api.test',
            headers: [row('a', 'b')],
            settings: { followRedirects: true },
        });
    });

    it('keeps the credentials as they were written, with no notice', () => {
        expect(
            parsedOf(
                "curl https://api.test -H 'Authorization: Bearer abc' -b 'a=1' -u ana:hunter2",
            ),
        ).toMatchObject({
            request: {
                headers: [row('Authorization', 'Bearer abc'), row('Cookie', 'a=1')],
                auth: { type: 'basic', username: 'ana', password: 'hunter2' },
            },
            notices: [],
        });
    });

    it('puts the bearer of --oauth2-bearer in the auth and does not take it for the url', () => {
        expect(parsedOf('curl --oauth2-bearer abc https://api.test').request).toMatchObject({
            url: 'https://api.test',
            auth: { type: 'bearer', token: 'abc' },
        });
    });

    it('moves the user of the url to the auth, decoded, and -u wins over it', () => {
        expect(parsedOf('curl https://ana:p%40ss@api.test/a').request).toMatchObject({
            url: 'https://api.test/a',
            auth: { type: 'basic', username: 'ana', password: 'p@ss' },
        });
        expect(parsedOf('curl -u bob:x https://ana:y@api.test/a').request).toMatchObject({
            url: 'https://api.test/a',
            auth: { type: 'basic', username: 'bob', password: 'x' },
        });
    });

    it('adds the params of --url-query and the range of -r where they belong', () => {
        expect(
            parsedOf("curl 'https://api.test?a=1' --url-query 'b=c d' -r 0-99").request,
        ).toMatchObject({
            query: [row('a', '1'), row('b', 'c d')],
            headers: [row('Range', 'bytes=0-99')],
        });
    });

    it('ignores a blank word and follows the redirects of --location-trusted', () => {
        expect(parsedOf("curl ' ' --location-trusted https://api.test")).toMatchObject({
            request: { url: 'https://api.test', settings: { followRedirects: true } },
            notices: [],
        });
    });

    it('splits a form body whose ampersands came escaped', () => {
        expect(parsedOf("curl https://api.test -d 'a=1\\&b=2'").request.body).toEqual({
            type: 'urlencoded',
            fields: [row('a', '1'), row('b', '2')],
        });
    });

    it('reads a byte order mark and a caret left at the end', () => {
        expect(parsedOf('\ufeffcurl https://api.test').request.url).toBe('https://api.test');
        expect(parsedOf('curl ^"https://api.test^" ^').request.url).toBe('https://api.test');
    });

    it('does not break on a user that is not valid percent encoding', () => {
        expect(parsedOf('curl https://ana:%zz@api.test').request.auth).toEqual({
            type: 'basic',
            username: 'ana',
            password: '%zz',
        });
    });

    it.each([
        '--ssl-no-revoke',
        '--digest',
        '--http1.1',
        '--tlsv1.2',
        '--proto =https',
        '--keepalive-time 5',
        '--noproxy *',
    ])('lets pass %s without a word and without losing the url', (option) => {
        expect(parsedOf(`curl ${option} https://api.test`)).toMatchObject({
            request: { url: 'https://api.test' },
            notices: [],
        });
    });
});
