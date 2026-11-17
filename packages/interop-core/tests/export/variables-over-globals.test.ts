import { describe, expect, it } from 'vitest';

import { variablesOverGlobals } from '../../src/export/variables-over-globals.js';

function variableOf(name: string, value: string) {
    return { name, value, enabled: true, secret: false };
}

describe('variablesOverGlobals', () => {
    it('keeps one per name, and the collection wins', () => {
        expect(
            variablesOverGlobals(
                [variableOf('zona', 'colección')],
                [variableOf('zona', 'global'), variableOf('host', 'x')],
            ),
        ).toEqual([variableOf('zona', 'colección'), variableOf('host', 'x')]);
    });

    it('is the globals when the collection has none', () => {
        expect(variablesOverGlobals([], [variableOf('host', 'x')])).toEqual([
            variableOf('host', 'x'),
        ]);
    });
});
