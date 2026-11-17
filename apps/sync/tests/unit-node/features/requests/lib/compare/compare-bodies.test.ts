import { describe, expect, it } from 'vitest';

import { compareBodies } from '../../../../../../src/renderer/features/requests/lib/compare/compare-bodies.js';

describe('the bodies of a comparison (compare-bodies)', () => {
    it('walks two JSON bodies', () => {
        const result = compareBodies('{"a":1}', '{"a": 2}');

        expect(result.json).toBe(true);
        expect(result.differences).toBe(0);
        expect(result.changes).toBe(1);
        expect(compareBodies('{"a":1}', '{"a":"2"}').differences).toBe(1);
    });

    it('takes two equal texts as nothing to see', () => {
        expect(compareBodies('one\ntwo', 'one\ntwo')).toEqual({
            changes: 0,
            differences: 0,
            json: false,
        });
    });

    it('takes two different texts as one other content, counted as a change', () => {
        expect(compareBodies('one\ntwo', 'one\nthree')).toEqual({
            changes: 1,
            differences: 0,
            json: false,
        });
    });

    it('takes a JSON body against a text as a text', () => {
        const result = compareBodies('{"a":1}', 'oops');

        expect(result.json).toBe(false);
        expect(result.changes).toBe(1);
    });

    it('takes an empty expected body against an empty received one as equal', () => {
        expect(compareBodies('', '').differences).toBe(0);
        expect(compareBodies('', '').changes).toBe(0);
    });
});
