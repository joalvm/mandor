import { describe, expect, it } from 'vitest';

import {
    mergeWithheld,
    pushUsedOnce,
    type UsedVariable,
} from '../../src/resolution/resolve-text-result.js';

function used(name: string, level: UsedVariable['level'] = 'environment'): UsedVariable {
    return { name, level, secret: false };
}

describe('recording the variables a resolution used', () => {
    it('adds a name the first time it resolves', () => {
        const list: UsedVariable[] = [];

        pushUsedOnce(list, used('host'));

        expect(list).toEqual([used('host')]);
    });

    /** A name resolves the same way every time within one resolution: the first entry says it all. */
    it('keeps a name once, with what the first resolution said', () => {
        const list: UsedVariable[] = [used('host', 'environment')];

        pushUsedOnce(list, used('host', 'globals'));
        pushUsedOnce(list, used('port'));

        expect(list).toEqual([used('host', 'environment'), used('port')]);
    });
});

describe('recording the secrets a resolution withheld', () => {
    it('leaves the result without the field when nothing was withheld', () => {
        const result: { withheld?: string[] } = {};

        mergeWithheld(result);
        mergeWithheld(result, []);

        expect(result).toEqual({});
    });

    it('adds each name once, in the order they came', () => {
        const result: { withheld?: string[] } = {};

        mergeWithheld(result, ['token', 'key']);
        mergeWithheld(result, ['key', 'other', 'token']);

        expect(result.withheld).toEqual(['token', 'key', 'other']);
    });
});
