import { describe, expect, it } from 'vitest';

import { formattedJsonc } from '../../src/editor/jsonc-format.js';

describe('laying out a jsonc text', () => {
    it('indents every level by four spaces', () => {
        expect(formattedJsonc('{"a":1,"b":[1,2],"c":{}}')).toBe(
            '{\n    "a": 1,\n    "b": [\n        1,\n        2\n    ],\n    "c": {}\n}',
        );
    });

    /** A parse and a stringify would drop them: the text is laid out, not rewritten. */
    it('keeps the comments where they were written', () => {
        expect(formattedJsonc('{// c\n"a":1, /* b */ "d": [] }')).toBe(
            '{ // c\n    "a": 1, /* b */\n    "d": []\n}',
        );
    });

    it('keeps every template as it was written, bare or quoted', () => {
        expect(formattedJsonc('{"n":{{count}},"s":"{{name}}"}')).toBe(
            '{\n    "n": {{count}},\n    "s": "{{name}}"\n}',
        );
    });

    /** Laying out a broken text would move the error away from where the person left it. */
    it('leaves a text it cannot read alone', () => {
        expect(formattedJsonc('{"a": }')).toBeNull();
    });

    /**
     * A layout is one edit per gap between tokens: a megabyte holds hundreds of thousands. Applied
     * one by one, each rebuilding the whole text, they froze the window for minutes.
     */
    it('lays a megabyte out in one pass over the text', () => {
        const item = '{"id":1,"name":"item","tags":["a","b"],"ok":true}';
        const text = `[${Array(20_000).fill(item).join(',')}]`;
        const started = performance.now();
        const laid = formattedJsonc(text);

        expect(performance.now() - started).toBeLessThan(5_000);
        expect(laid?.startsWith('[\n    {\n        "id": 1,\n')).toBe(true);
        expect(laid?.endsWith('        "ok": true\n    }\n]')).toBe(true);
    });
});
