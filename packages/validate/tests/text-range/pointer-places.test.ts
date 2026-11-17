import { describe, expect, it } from 'vitest';

import { placesIn } from '../../src/text-range/pointer-places.js';

describe('placesIn', () => {
    const text =
        '{\n  // owner\n  "data": {\n    "expire": 1735689600,\n    "tags": ["a", "b"]\n  },\n}';

    it('says the line a pointer lands on and the value it holds there, as compact JSON', () => {
        const at = placesIn(text);

        expect(at('/data/expire')).toEqual({ excerpt: '1735689600', line: 4 });
        expect(at('/data/tags')).toEqual({ excerpt: '["a","b"]', line: 5 });
        expect(at('')).toEqual({
            excerpt: '{"data":{"expire":1735689600,"tags":["a","b"]}}',
            line: 1,
        });
    });

    it('cuts a long value short, since it is only read on one line', () => {
        const long = JSON.stringify({ text: 'x'.repeat(500) });

        expect(placesIn(long)('/text')?.excerpt).toHaveLength(200);
    });

    it('has no place for a pointer that leaves the text, nor in a text it cannot read', () => {
        expect(placesIn(text)('/data/missing')).toBeUndefined();
        expect(placesIn('{"a": ')('/a')).toBeUndefined();
        expect(placesIn('')('')).toBeUndefined();
    });
});
