import { describe, expect, it } from 'vitest';

import { composeScope, computeDynamicValues, resolveText } from '../../src/index.js';

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('computeDynamicValues', () => {
    it('returns a value for each of the three built-in dynamic variables', () => {
        const values = computeDynamicValues();

        expect(Object.keys(values).sort()).toEqual(['$randomInt', '$timestamp', '$uuid']);
    });

    it('returns a UUID-shaped value for $uuid', () => {
        expect(computeDynamicValues()['$uuid']).toMatch(UUID_SHAPE);
    });

    it('returns the Unix time in whole seconds for $timestamp', () => {
        const before = Math.floor(Date.now() / 1000);
        const timestamp = Number(computeDynamicValues()['$timestamp']);
        const after = Math.floor(Date.now() / 1000);

        expect(Number.isInteger(timestamp)).toBe(true);
        expect(timestamp).toBeGreaterThanOrEqual(before);
        expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('returns an integer within the documented range 0 to 1000 for $randomInt', () => {
        const value = Number(computeDynamicValues()['$randomInt']);

        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1000);
    });

    it('computes fresh values on every call', () => {
        expect(computeDynamicValues()['$uuid']).not.toBe(computeDynamicValues()['$uuid']);
    });
});

describe('dynamic level in a resolution', () => {
    it('resolves two {{$uuid}} in the same text to the same value', () => {
        const scope = composeScope({ dynamic: computeDynamicValues() });
        const result = resolveText('{{$uuid}} {{$uuid}}', scope);
        const [first, second] = result.text.split(' ');

        expect(first).toMatch(UUID_SHAPE);
        expect(second).toBe(first);
    });

    it('resolves {{$uuid}} to different values in two separate resolutions', () => {
        const first = resolveText('{{$uuid}}', composeScope({ dynamic: computeDynamicValues() }));
        const second = resolveText('{{$uuid}}', composeScope({ dynamic: computeDynamicValues() }));

        expect(first.text).not.toBe(second.text);
    });

    it('lets a $uuid declared in the environment win over the dynamic one', () => {
        const scope = composeScope({
            environment: { $uuid: 'env-uuid' },
            dynamic: computeDynamicValues(),
        });
        const result = resolveText('{{$uuid}}', scope);

        expect(result.text).toBe('env-uuid');
        expect(result.used).toEqual([{ name: '$uuid', level: 'environment', secret: false }]);
    });
});
