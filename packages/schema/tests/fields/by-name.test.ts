import { describe, expect, it } from 'vitest';

import { byName } from '../../src/fields/by-name.js';

describe('the order of what nobody arranges', () => {
    it('goes by the name, whatever the id says', () => {
        const listed = [
            { id: 'a1', name: 'Zeta' },
            { id: 'z9', name: 'Alfa' },
        ].toSorted(byName);

        expect(listed.map((entry) => entry.name)).toEqual(['Alfa', 'Zeta']);
    });

    it('settles two equal names by the id', () => {
        const listed = [
            { id: 'z9', name: 'Igual' },
            { id: 'a1', name: 'Igual' },
        ].toSorted(byName);

        expect(listed.map((entry) => entry.id)).toEqual(['a1', 'z9']);
    });
});
