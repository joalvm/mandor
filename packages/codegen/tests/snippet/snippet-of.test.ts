import { SNIPPET_TARGETS } from '@mandor/schema';
import { HTTPSnippet } from '@readme/httpsnippet';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SnippetError } from '../../src/snippet/snippet-error.js';
import type { SnippetRequest, SnippetSettings } from '../../src/snippet/snippet-request.js';
import { snippetOf } from '../../src/snippet/snippet-of.js';

/** A request that kept no setting of its own: what the app does by default stays unsaid. */
const PLAIN: SnippetSettings = {};
const postJson: SnippetRequest = {
    method: 'POST',
    url: 'https://api.example.test/v1/items?limit=10',
    headers: [['Accept', 'application/json']],
    body: { type: 'text', contentType: 'application/json', text: '{"title":"hello"}' },
};
const get: SnippetRequest = {
    method: 'GET',
    url: 'https://api.example.test/v1/items',
    headers: [],
    body: { type: 'none' },
};

afterEach(() => {
    vi.restoreAllMocks();
});

describe('the code a request is copied as', () => {
    it.each(SNIPPET_TARGETS)('writes %s with the URL and the body', (target) => {
        const code = snippetOf(postJson, target, PLAIN);

        expect(code).toContain('api.example.test/v1/items');
        expect(code).toContain('hello');
    });

    it('writes no data for a GET', () => {
        expect(snippetOf(get, 'curl', PLAIN)).not.toMatch(/--data|-d /);
    });

    it('writes a form with --form and never its own boundary', () => {
        const code = snippetOf(
            {
                ...postJson,
                body: {
                    type: 'form',
                    fields: [
                        { name: 'a', value: '1', kind: 'text' },
                        { name: 'doc', value: 'report.pdf', kind: 'file' },
                    ],
                },
            },
            'curl',
            PLAIN,
        );

        expect(code).toContain('--form');
        expect(code).not.toContain('boundary=');
    });

    it('skips the certificate check in curl only when told to', () => {
        expect(snippetOf(get, 'curl', { ...PLAIN, validateTls: false })).toMatch(/--insecure|-k /);
        expect(snippetOf(get, 'curl', PLAIN)).not.toMatch(/--insecure|-k /);
    });

    it('tells go the timeout in whole seconds, rounded up, and to trust the certificate', () => {
        const code = snippetOf(get, 'go-native', { ...PLAIN, timeoutMs: 2500, validateTls: false });

        expect(code).toContain('time.Duration(3 * time.Second)');
        expect(code).toContain('InsecureSkipVerify: true');
        expect(snippetOf(get, 'go-native', PLAIN)).not.toMatch(/time\.Duration|InsecureSkipVerify/);
    });

    it('tells php how many redirects to follow, none when the send follows none', () => {
        const sent = { followRedirects: false, timeoutMs: 30_000 };

        expect(snippetOf(get, 'php-curl', sent)).toContain('CURLOPT_MAXREDIRS => 0');
        expect(snippetOf(get, 'php-curl', sent)).toContain('CURLOPT_TIMEOUT => 30');
        expect(snippetOf(get, 'php-curl', { followRedirects: true, maxRedirects: 5 })).toContain(
            'CURLOPT_MAXREDIRS => 5',
        );
        expect(snippetOf(get, 'php-curl', PLAIN)).not.toContain('CURLOPT_MAXREDIRS => 0');
    });

    it('keeps a URL that is already encoded, without encoding it twice', () => {
        const code = snippetOf({ ...get, url: 'https://h.example.test/s?q=a%20b' }, 'curl', PLAIN);

        expect(code).toMatch(/q=a(%20|\+)b/);
        expect(code).not.toContain('%2520');
    });

    it('writes the secret nowhere when the caller redacted it before', () => {
        const secret = 's3cr3t value/+&';
        const redacted: SnippetRequest = {
            method: 'POST',
            url: 'https://api.example.test/v1?api_key=[redacted]',
            headers: [['Authorization', 'Bearer [redacted]']],
            body: { type: 'urlencoded', fields: [['password', '[redacted]']] },
        };
        const forms = [
            secret,
            encodeURIComponent(secret),
            new URLSearchParams({ s: secret }).get('s'),
        ];

        for (const target of SNIPPET_TARGETS) {
            const code = snippetOf(redacted, target, PLAIN);

            expect(forms.filter((form) => form !== null && code.includes(form))).toEqual([]);
        }
    });

    /** A value of a collection someone else wrote must not run when the copied code does. */
    it.each([
        ['powershell-webrequest', "'$(whoami)'"],
        ['php-curl', "'X-Evil: {${system(\\'id\\')}}'"],
    ] as const)(
        'writes %s with a hostile value as a literal that runs nothing',
        (target, literal) => {
            const value = target === 'php-curl' ? "{${system('id')}}" : '$(whoami)';
            const code = snippetOf(
                { ...get, headers: [['X-Evil', value]], body: { type: 'none' } },
                target,
                PLAIN,
            );

            expect(code).toContain(literal.slice(0, -1));
            expect(code).not.toMatch(/"[^"\n]*(\$\(whoami\)|\{\$\{system)/);
        },
    );

    it.each(['js-fetch', 'node-axios'] as const)(
        'writes %s with a backslash before a quote as a literal that runs nothing',
        (target) => {
            const value = "\\\\'+(globalThis.x=1)//";
            const code = snippetOf({ ...get, headers: [['X-Evil', value]] }, target, PLAIN);

            expect(code).toContain(JSON.stringify(value));
        },
    );

    it.each([[[false]], [[]]])('fails with the language when the library writes %j', (output) => {
        vi.spyOn(HTTPSnippet.prototype, 'convert').mockReturnValue(output as (string | false)[]);

        expect(() => snippetOf(get, 'go-native', PLAIN)).toThrow(SnippetError);
        expect(() => snippetOf(get, 'go-native', PLAIN)).toThrow(
            'the snippet library wrote nothing for go-native',
        );
    });
});
