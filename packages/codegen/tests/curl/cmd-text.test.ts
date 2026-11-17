import { describe, expect, it } from 'vitest';

import { fromCmdText } from '../../src/curl/cmd-text.js';

describe('a command written for cmd', () => {
    it('takes the carets off the strings of Chrome', () => {
        expect(fromCmdText('curl ^"https://h?a=1^&b=2^"')).toBe('curl "https://h?a=1&b=2"');
    });

    it('keeps the backslash of a quote inside a string', () => {
        expect(fromCmdText('-d ^"^{^\\^"a^\\^":1^}^"')).toBe('-d "{\\"a\\":1}"');
    });

    it('joins the lines a caret ends, with either line end', () => {
        expect(fromCmdText('curl x ^\n  -s ^\r\n  -k')).toBe('curl x    -s    -k');
    });

    it('keeps a line break of a value, written as a caret and two breaks', () => {
        expect(fromCmdText('curl -d ^"a^\n\nb^"')).toBe('curl -d "a\nb"');
        expect(fromCmdText('curl -d ^"a^\r\n\r\nb^"')).toBe('curl -d "a\nb"');
    });

    it('leaves a caret inside plain quotes, as cmd does', () => {
        expect(fromCmdText('curl "a^b" ^\n-s')).toBe('curl "a^b"  -s');
    });

    it('takes the caret off an ampersand even inside plain quotes', () => {
        expect(fromCmdText('curl "a?x=1^&y=2" ^\n-s')).toBe('curl "a?x=1&y=2"  -s');
    });

    it('protects a dollar wherever it comes', () => {
        expect(fromCmdText('curl ^"a?^$top=1^" "$b" $c ^\n')).toBe(
            'curl "a?\\$top=1" "\\$b" \\$c  ',
        );
    });

    it('drops a caret with nothing after it', () => {
        expect(fromCmdText('curl ^"a^" ^')).toBe('curl "a" ');
    });

    it('leaves alone a command that was not written for cmd', () => {
        const text = 'curl \'https://h?a=^b\' -d "$c"';

        expect(fromCmdText(text)).toBe(text);
    });
});
