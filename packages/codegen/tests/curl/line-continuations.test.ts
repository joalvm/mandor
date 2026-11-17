import { describe, expect, it } from 'vitest';

import { joinContinuations } from '../../src/curl/line-continuations.js';

describe('the line continuations of a pasted command', () => {
    it('joins the three lines Chrome writes into one', () => {
        const text = "curl 'https://h/x' \\\n  -H 'A: b' \\\n  --data-raw 'c'";

        expect(joinContinuations(text)).toBe("curl 'https://h/x'    -H 'A: b'    --data-raw 'c'");
    });

    it('joins the lines a Windows editor ends with a carriage return', () => {
        expect(joinContinuations('curl \\\r\n  x')).toBe('curl    x');
    });

    it('leaves a backslash that does not end a line', () => {
        expect(joinContinuations('curl a\\b')).toBe('curl a\\b');
    });

    it.each([
        ['spaces after the backslash', 'curl \\  \n  x', 'curl    x'],
        ['a backslash ending the text', 'curl x \\', 'curl x  '],
        ['a backslash left alone between words', 'curl \\ x \\ y', 'curl  x  y'],
        ['the backtick of PowerShell', 'curl `\n  x', 'curl    x'],
        ['a backtick ending the text', 'curl x `  ', 'curl x  '],
    ])('joins through %s', (_name, text, joined) => {
        expect(joinContinuations(text)).toBe(joined);
    });

    it('keeps the space a backslash glues to a word', () => {
        expect(joinContinuations('curl a:\\ b')).toBe('curl a:\\ b');
    });

    it('takes the line out of a double quoted string, with no space', () => {
        expect(joinContinuations('curl "a?\\\nb=1&\\\r\nc=2"')).toBe('curl "a?b=1&c=2"');
    });

    it('keeps the other escapes of a double quoted string', () => {
        expect(joinContinuations('curl "a\\"b\\\\"')).toBe('curl "a\\"b\\\\"');
    });

    it('leaves a single quoted string as it is', () => {
        const text = "curl 'a\\\nb \\ c `\n'";

        expect(joinContinuations(text)).toBe(text);
    });
});
