import { describe, expect, it } from 'vitest';

import {
    EMPTY_SCRIPT_CONTEXT,
    SAMPLE_DEPTH,
    SAMPLE_FIELDS,
    SAMPLE_TEXT_LIMIT,
    SAMPLE_WIDTH,
    sampleFieldPaths,
    sampleOf,
    sampleTypeOf,
    sentHeaderNames,
} from '../../src/api/script-context.js';

const OPEN = '[key: string]: any;';

/** An object that nests `depth` times, one key a level (`k0` outermost), a number at the bottom. */
function nested(depth: number): unknown {
    return Array.from({ length: depth }, (_, index) => depth - 1 - index).reduce<unknown>(
        (inner, level) => ({ [`k${String(level)}`]: inner }),
        1,
    );
}

/** An object of `SAMPLE_WIDTH` rows of `SAMPLE_WIDTH` numbers: more fields than may be read in all. */
function rows(): Record<string, unknown> {
    const row = Object.fromEntries(
        Array.from({ length: SAMPLE_WIDTH }, (_, index) => [`f${String(index)}`, index]),
    );

    return Object.fromEntries(
        Array.from({ length: SAMPLE_WIDTH }, (_, index) => [`r${String(index)}`, { ...row }]),
    );
}

describe('the context of a script', () => {
    it('starts with nothing to suggest', () => {
        expect(EMPTY_SCRIPT_CONTEXT).toEqual({ headers: [], sample: undefined, variables: [] });
    });

    it('names the headers a place sends, switched on and named, once each', () => {
        expect(
            sentHeaderNames([
                { enabled: true, key: 'Authorization' },
                { enabled: false, key: 'X-Off' },
                { enabled: true, key: '' },
                { enabled: true, key: 'Authorization' },
            ]),
        ).toEqual(['Authorization']);
        expect(sentHeaderNames([])).toEqual([]);
    });
});

describe('sampleOf', () => {
    it('reads a JSON text', () => {
        expect(sampleOf('{"id": 1}')).toEqual({ id: 1 });
    });

    it('gives nothing for a text that is no JSON, or for no text', () => {
        expect(sampleOf('<html>')).toBeUndefined();
        expect(sampleOf(undefined)).toBeUndefined();
    });

    /** A body past the limit costs more to read than the names it would give. */
    it('leaves a text past its limit unread', () => {
        const long = `"${'a'.repeat(SAMPLE_TEXT_LIMIT)}"`;

        expect(sampleOf(long)).toBeUndefined();
    });
});

describe('sampleTypeOf', () => {
    it('is any with no sample, and for null', () => {
        expect(sampleTypeOf(undefined)).toBe('any');
        expect(sampleTypeOf(null)).toBe('any');
    });

    it('names the type of a value as JSON has it', () => {
        expect(sampleTypeOf(true)).toBe('boolean');
        expect(sampleTypeOf(1)).toBe('number');
        expect(sampleTypeOf('a')).toBe('string');
    });

    /** Every level stays open: a field the sample lacks is no error, the next response may bring it. */
    it('types each field of an object, and leaves every object open', () => {
        expect(sampleTypeOf({ id: 1, user: { name: 'a' } })).toBe(
            `{ id: number; user: { name: string; ${OPEN} }; ${OPEN} }`,
        );
    });

    it('quotes a key that is no name of JavaScript', () => {
        expect(sampleTypeOf({ 'x-id': 1 })).toBe(`{ "x-id": number; ${OPEN} }`);
    });

    it('types a list by its first item, and an empty one as a list of anything', () => {
        expect(sampleTypeOf([{ id: 1 }, 'b'])).toBe(`{ id: number; ${OPEN} }[]`);
        expect(sampleTypeOf([])).toBe('any[]');
    });

    it('stops at its depth', () => {
        const type = sampleTypeOf(nested(SAMPLE_DEPTH + 2));

        expect(type.match(/k\d+:/gu)).toHaveLength(SAMPLE_DEPTH);
        expect(type).toContain(`k${String(SAMPLE_DEPTH - 1)}: any;`);
    });

    it('stops at its width', () => {
        const wide = Object.fromEntries(
            Array.from({ length: SAMPLE_WIDTH + 5 }, (_, index) => [`f${String(index)}`, index]),
        );

        expect(sampleTypeOf(wide).match(/: number;/gu)).toHaveLength(SAMPLE_WIDTH);
    });

    it('stops when it has typed as many fields as it may in all', () => {
        expect(sampleTypeOf(rows()).match(/\b[fr]\d+:/gu)).toHaveLength(SAMPLE_FIELDS);
    });
});

describe('sampleFieldPaths', () => {
    it('gives nothing for a sample that is no object', () => {
        expect(sampleFieldPaths(undefined).size).toBe(0);
        expect(sampleFieldPaths([{ id: 1 }]).size).toBe(0);
    });

    it('gives the path a script writes to each field, the shallowest first', () => {
        const paths = sampleFieldPaths({ data: { token: 'a', 'x-id': 1 }, token: 'b' });

        expect(paths.get('token')).toBe('.token');
        expect(paths.get('data')).toBe('.data');
        expect(paths.get('x-id')).toBe('.data["x-id"]');
    });

    it('does not walk into a list', () => {
        expect(sampleFieldPaths({ items: [{ id: 1 }] }).has('id')).toBe(false);
    });

    it('stops at its depth', () => {
        const paths = sampleFieldPaths(nested(SAMPLE_DEPTH + 2));

        expect(paths.get('k1')).toBe('.k0.k1');
        expect(paths.has(`k${String(SAMPLE_DEPTH - 1)}`)).toBe(true);
        expect(paths.has(`k${String(SAMPLE_DEPTH)}`)).toBe(false);
    });

    it('stops when it has walked as many fields as it may in all', () => {
        expect(sampleFieldPaths({ ...rows(), last: { deep: 1 } }).has('deep')).toBe(false);
    });
});
