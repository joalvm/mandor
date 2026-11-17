import { describe, expect, it } from 'vitest';

import { curlCommandOf } from '../../src/snippet/curl-command.js';
import type { SnippetRequest, SnippetSettings } from '../../src/snippet/snippet-request.js';
import { parsedOf, row } from '../curl/parsed-of.js';

/** A request that kept no setting of its own: what the app does by default stays unsaid. */
const PLAIN: SnippetSettings = {};
const JSON_TEXT = '{"title":"a (b)"}';

/** A POST of JSON, its text the one given. */
function posting(text = JSON_TEXT): SnippetRequest {
    return {
        method: 'POST',
        url: 'https://api.test/items?limit=10',
        headers: [['Accept', 'application/json']],
        body: { type: 'text', contentType: 'application/json', text },
    };
}

const postJson = posting();

describe('a request copied as curl for bash', () => {
    it('writes the URL first and one option per line, each continued but the last', () => {
        expect(curlCommandOf(postJson, 'bash', PLAIN)).toBe(
            [
                "curl --url 'https://api.test/items?limit=10' \\",
                "  -H 'Accept: application/json' \\",
                "  -H 'Content-Type: application/json' \\",
                `  --data-raw '{"title":"a (b)"}'`,
            ].join('\n'),
        );
    });

    it('is read back as the same request', () => {
        const { request } = parsedOf(curlCommandOf({ ...postJson, method: 'PUT' }, 'bash', PLAIN));

        expect(request).toMatchObject({
            method: 'PUT',
            url: 'https://api.test/items',
            query: [row('limit', '10')],
            body: { type: 'json', content: JSON_TEXT },
        });
    });

    it('keeps the type a text already names, and adds none of its own', () => {
        const code = curlCommandOf(
            { ...postJson, headers: [['content-type', 'application/vnd.api+json']] },
            'bash',
            PLAIN,
        );

        expect(code).toContain("-H 'content-type: application/vnd.api+json'");
        expect(code).not.toContain('application/json');
    });

    it('says the method only when curl would not take it on its own', () => {
        const get = { ...postJson, method: 'GET', body: { type: 'none' } } as const;

        expect(curlCommandOf(get, 'bash', PLAIN)).not.toContain('-X');
        expect(curlCommandOf({ ...get, method: 'DELETE' }, 'bash', PLAIN)).toContain("-X 'DELETE'");
        expect(curlCommandOf(postJson, 'bash', PLAIN)).not.toContain('-X');
    });

    it("quotes in $'…' a word with a quote, a ! or a line break", () => {
        const text = "it's\nnew!";
        const code = curlCommandOf(posting(text), 'bash', PLAIN);

        expect(code).toContain(String.raw`--data-raw $'it\'s\nnew\u0021'`);
    });

    it('writes a form field by field: a text as is, a file by its path, and no boundary', () => {
        const code = curlCommandOf(
            {
                ...postJson,
                headers: [['Content-Type', 'multipart/form-data; boundary=x']],
                body: {
                    type: 'form',
                    fields: [
                        { name: 'a', value: '@1', kind: 'text' },
                        { name: 'doc', value: 'report.pdf', kind: 'file' },
                    ],
                },
            },
            'bash',
            PLAIN,
        );

        expect(code).toContain("--form-string 'a=@1'");
        expect(code).toContain("-F 'doc=@report.pdf'");
        expect(code).not.toContain('boundary');
    });

    it('encodes each field of a urlencoded body and sends an empty header', () => {
        const code = curlCommandOf(
            {
                ...postJson,
                headers: [['X-Empty', '']],
                body: { type: 'urlencoded', fields: [['q', 'a b']] },
            },
            'bash',
            PLAIN,
        );

        expect(code).toContain("-H 'X-Empty;'");
        expect(code).toContain("--data-urlencode 'q=a b'");
    });
});

describe('the settings of a send, in the curl it is copied as', () => {
    const get: SnippetRequest = { ...postJson, method: 'GET', headers: [], body: { type: 'none' } };
    const sent: SnippetSettings = {
        followRedirects: true,
        keepMethodOnRedirect: true,
        maxRedirects: 3,
        timeoutMs: 2500,
        validateTls: false,
    };

    it('follows, keeps the method, gives up in time and trusts the certificate, as the send does', () => {
        expect(curlCommandOf(get, 'bash', sent).split(' \\\n  ').slice(1)).toEqual([
            '-L',
            '--max-redirs 3',
            '--post301',
            '--post302',
            '--max-time 2.5',
            '--insecure',
        ]);
    });

    it('is read back with the same settings', () => {
        expect(parsedOf(curlCommandOf(get, 'bash', sent)).request.settings).toEqual({
            followRedirects: true,
            keepMethodOnRedirect: true,
            maxRedirects: 3,
            timeoutMs: 2500,
            validateTls: false,
        });
    });

    it('says only what the request set, and nothing the app fills in on its own', () => {
        expect(curlCommandOf(get, 'bash', PLAIN)).toBe(
            "curl --url 'https://api.test/items?limit=10'",
        );
        expect(curlCommandOf(get, 'bash', { followRedirects: true }).split(' \\\n  ')).toEqual([
            "curl --url 'https://api.test/items?limit=10'",
            '-L',
        ]);
        expect(curlCommandOf(get, 'bash', { timeoutMs: 0, validateTls: true })).toBe(
            "curl --url 'https://api.test/items?limit=10'",
        );
    });

    it('lets curl turn a POST into a GET on a redirect when the send does too', () => {
        const code = curlCommandOf(get, 'bash', { ...sent, keepMethodOnRedirect: false });

        expect(code).toContain('--max-redirs 3');
        expect(code).not.toContain('--post30');
    });
});

describe('a request copied as curl for cmd', () => {
    it('quotes with carets and continues each line with one, the way DevTools does', () => {
        expect(curlCommandOf(postJson, 'cmd', PLAIN)).toBe(
            [
                'curl --url ^"https://api.test/items?limit=10^" ^',
                '  -H ^"Accept: application/json^" ^',
                '  -H ^"Content-Type: application/json^" ^',
                String.raw`  --data-raw ^"^{^\^"title^\^":^\^"a ^(b^)^\^"^}^"`,
            ].join('\n'),
        );
    });

    it('keeps a variable from being expanded and carries a line break inside the word', () => {
        const code = curlCommandOf(posting('%PATH%&\nx'), 'cmd', PLAIN);

        expect(code).toContain('--data-raw ^"^%^PATH^%^&^\n\nx^"');
    });
});
