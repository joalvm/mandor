import { describe, expect, it } from 'vitest';

import { phpCurlCommandOf } from '../../src/snippet/php-curl-command.js';
import type { SnippetRequest } from '../../src/snippet/snippet-request.js';

const get: SnippetRequest = {
    method: 'GET',
    url: 'https://h.example.test/s?q=a%20b',
    headers: [['Accept', 'application/json']],
    body: { type: 'none' },
};

describe('the PHP a request is copied as', () => {
    /**
     * A collection pulled from someone else names the values, and a double-quoted PHP string runs
     * `{${…}}` inside it. Every value goes in single quotes, where only `\` and `'` mean anything.
     */
    it('keeps a hostile value inside its literal, where nothing in it runs', () => {
        const evil = "{${system('id')}}$x\\";
        const code = phpCurlCommandOf(
            {
                method: 'POST',
                url: 'https://h.example.test/p',
                headers: [['X-Evil', evil]],
                body: { type: 'text', contentType: 'text/plain', text: evil },
            },
            {},
        );
        const escaped = "{${system(\\'id\\')}}$x\\\\";

        expect(code).toContain(`'X-Evil: ${escaped}',`);
        expect(code).toContain(`CURLOPT_POSTFIELDS => '${escaped}',`);
        expect(code).not.toContain('"');
    });

    it('writes a GET with its headers and no body', () => {
        expect(phpCurlCommandOf(get, {})).toBe(
            [
                '<?php',
                '',
                '$curl = curl_init();',
                '',
                'curl_setopt_array($curl, [',
                "  CURLOPT_URL => 'https://h.example.test/s?q=a%20b',",
                '  CURLOPT_RETURNTRANSFER => true,',
                "  CURLOPT_ENCODING => '',",
                '  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,',
                "  CURLOPT_CUSTOMREQUEST => 'GET',",
                '  CURLOPT_HTTPHEADER => [',
                "    'Accept: application/json',",
                '  ],',
                ']);',
                '',
                '$response = curl_exec($curl);',
                '$err = curl_error($curl);',
                '',
                'curl_close($curl);',
                '',
                'if ($err) {',
                "  echo 'cURL Error #:' . $err;",
                '} else {',
                '  echo $response;',
                '}',
            ].join('\n'),
        );
    });

    it('writes the timeout and the redirects only when the request kept them', () => {
        const code = phpCurlCommandOf(get, { timeoutSeconds: 30, maxRedirects: 0 });

        expect(code).toContain('  CURLOPT_MAXREDIRS => 0,\n  CURLOPT_TIMEOUT => 30,\n');
        expect(phpCurlCommandOf(get, {})).not.toMatch(/MAXREDIRS|TIMEOUT/);
    });

    it('says the type of a text body unless the request already did', () => {
        const code = phpCurlCommandOf(
            {
                ...get,
                method: 'POST',
                headers: [],
                body: { type: 'text', contentType: 'application/json', text: '{"a":1}' },
            },
            {},
        );

        expect(code).toContain('  CURLOPT_POSTFIELDS => \'{"a":1}\',');
        expect(code).toContain("    'Content-Type: application/json',");
    });

    it('keeps the type the request named for its body', () => {
        const code = phpCurlCommandOf(
            {
                ...get,
                method: 'POST',
                headers: [['content-type', 'application/vnd.api+json']],
                body: { type: 'text', contentType: 'application/json', text: '{}' },
            },
            {},
        );

        expect(code).toContain("    'content-type: application/vnd.api+json',");
        expect(code).not.toContain('Content-Type: application/json');
    });

    it('encodes the fields of a urlencoded body', () => {
        const code = phpCurlCommandOf(
            {
                ...get,
                method: 'PUT',
                headers: [],
                body: {
                    type: 'urlencoded',
                    fields: [
                        ['a', '1'],
                        ['b', 'x y&z'],
                    ],
                },
            },
            {},
        );

        expect(code).toContain("  CURLOPT_POSTFIELDS => 'a=1&b=x%20y%26z',");
        expect(code).toContain("    'Content-Type: application/x-www-form-urlencoded',");
    });

    it('sends a form as fields, a file read from its path, and never a boundary of its own', () => {
        const code = phpCurlCommandOf(
            {
                ...get,
                method: 'POST',
                headers: [['Content-Type', 'multipart/form-data; boundary=x']],
                body: {
                    type: 'form',
                    fields: [
                        { name: 'a', value: '1', kind: 'text' },
                        { name: 'doc', value: 'report.pdf', kind: 'file' },
                    ],
                },
            },
            {},
        );

        expect(code).toContain(
            [
                '  CURLOPT_POSTFIELDS => [',
                "    'a' => '1',",
                "    'doc' => new CURLFile('report.pdf'),",
                '  ],',
            ].join('\n'),
        );
        expect(code).not.toContain('boundary');
        expect(code).not.toContain('CURLOPT_HTTPHEADER');
    });
});
