import { describe, expect, it } from 'vitest';

import { CurlParseError } from '../../src/curl/curl-parse-error.js';
import { curlTokens } from '../../src/curl/curl-tokens.js';

describe('the words of a curl command', () => {
    it('turns a variable of the shell into a placeholder of Mandor', () => {
        expect(curlTokens('curl "$HOST/x" -H \'A: $B\'').words).toEqual([
            'curl',
            '{{HOST}}/x',
            '-H',
            'A: $B',
        ]);
        expect(curlTokens('curl ${BASE_URL}/x').words).toEqual(['curl', '{{BASE_URL}}/x']);
    });

    it('keeps the dollar of a name that is not a variable', () => {
        expect(curlTokens('curl "a$1"').words).toEqual(['curl', 'a$1']);
    });

    it('keeps an unquoted URL with a question mark whole', () => {
        expect(curlTokens('curl https://h/p?a=1').words).toEqual(['curl', 'https://h/p?a=1']);
    });

    it('stops at an operator and says so', () => {
        expect(curlTokens('curl x | jq')).toEqual({
            words: ['curl', 'x'],
            notices: [{ code: 'moreCommands' }],
        });
        expect(curlTokens('curl x && echo').notices).toEqual([{ code: 'moreCommands' }]);
    });

    it('stops at a comment and says so', () => {
        expect(curlTokens('curl x # nota')).toEqual({
            words: ['curl', 'x'],
            notices: [{ code: 'comment' }],
        });
    });

    it('refuses text the shell cannot read', () => {
        expect(() => curlTokens('curl ${}')).toThrow(CurlParseError);
        expect(() => curlTokens('curl ${}')).toThrow(/syntax/);
    });
});
