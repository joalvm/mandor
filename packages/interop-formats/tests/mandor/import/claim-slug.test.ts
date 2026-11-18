import { describe, expect, it } from 'vitest';

import { claimSlug } from '../../../src/mandor/import/claim-slug.js';

describe('claimSlug', () => {
    it('takes the plain id of a name and counts it as taken', () => {
        const taken = new Set<string>();

        expect(claimSlug(taken, 'Lista Mascotas', 'item')).toBe('lista-mascotas');
        expect([...taken]).toEqual(['lista-mascotas']);
    });

    it('suffixes a name a sibling already took, one sibling after another', () => {
        const taken = new Set<string>();
        const claimed = ['Pets', 'pets', 'PETS'].map((name) => claimSlug(taken, name, 'item'));

        expect(claimed).toEqual(['pets', 'pets-2', 'pets-3']);
    });

    it('gives a name with no letter an id of the plain word of its kind', () => {
        const taken = new Set<string>();

        expect(claimSlug(taken, '???', 'folder')).toBe('folder');
        expect(claimSlug(taken, '!!!', 'folder')).toBe('folder-2');
    });
});
