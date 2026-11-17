import { curlParseSchema } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { curlRequestOf } from '../../src/curl/curl-request-of.js';
import { parsedOf, row } from './parsed-of.js';

describe('the request a curl command describes', () => {
    it('keeps a password written out in -u, as it came', () => {
        const { request, notices } = parsedOf('curl -u ana:hunter2 https://h');

        expect(request.auth).toEqual({ type: 'basic', username: 'ana', password: 'hunter2' });
        expect(notices).toEqual([]);
    });

    it('takes the name of the command from its path, with or without .exe', () => {
        expect(curlRequestOf('/usr/bin/curl https://h').kind).toBe('parsed');
        expect(curlRequestOf("'C:\\tools\\CURL.EXE' https://h").kind).toBe('parsed');
        expect(curlRequestOf('  curl.exe https://h').kind).toBe('parsed');
    });

    it('adds http to a host with no scheme and keeps the rest of the URL', () => {
        expect(parsedOf('curl localhost:8080/x?y=1').request).toMatchObject({
            url: 'http://localhost:8080/x',
            query: [row('y', '1')],
        });
    });

    it('moves the data of -G to the query and makes the request a GET', () => {
        expect(parsedOf("curl -G https://h/s?a=1 --data-urlencode 'q=a b'").request).toMatchObject({
            method: 'GET',
            query: [row('a', '1'), row('q', 'a b')],
            body: { type: 'none' },
        });
    });

    it('makes the request a HEAD with -I', () => {
        expect(parsedOf('curl -I https://h').request.method).toBe('HEAD');
    });

    it('drops the multipart type the person wrote, because the boundary is the sender’s', () => {
        const { request } = parsedOf(
            "curl https://h -H 'Content-Type: multipart/form-data' -F a=1",
        );

        expect(request.headers).toEqual([]);
        expect(request.body.type).toBe('form');
    });

    it('says what it left out, in the order it met it', () => {
        const { notices } = parsedOf(
            'curl https://a https://b -x http://p:1 -W -m abc -o out | jq',
        );

        expect(notices).toEqual([
            { code: 'moreCommands' },
            { code: 'unsupportedOption', subject: '-x' },
            { code: 'unknownOption', subject: '-W' },
            { code: 'extraUrl', subject: 'https://b' },
            { code: 'settingOutOfRange', subject: '-m' },
        ]);
    });

    it('does not hide a bug of its own behind an invalid result', () => {
        expect(() => curlRequestOf(null as unknown as string)).toThrow(TypeError);
    });

    it.each([
        ['text that is not curl', 'wget https://h', 'notCurl', undefined],
        ['nothing', '', 'notCurl', undefined],
        ['a curl with no URL', 'curl -s', 'noUrl', undefined],
        ['an option with no value', 'curl https://h -H', 'missingArgument', '-H'],
        ['text the shell cannot read', 'curl ${}', 'syntax', undefined],
        ['a form field with no equals sign', 'curl https://h -F nope', 'syntax', '--form'],
    ])('does not read %s', (_name, text, reason, subject) => {
        const result = curlRequestOf(text);

        expect(curlParseSchema.safeParse(result).success).toBe(true);
        expect(result).toEqual(
            subject === undefined
                ? { kind: 'invalid', reason }
                : { kind: 'invalid', reason, subject },
        );
    });
});
