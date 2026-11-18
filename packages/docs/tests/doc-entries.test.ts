import { describe, expect, it } from 'vitest';

import { docEntries } from '../src/lib/doc-entries.js';

describe('building search entries from the docs', () => {
    it('makes one entry per doc, named by its title and pointing at its file', () => {
        const entries = docEntries(
            [
                { name: 'k3m9x2q7a4bd.md', title: 'Pedidos' },
                { name: 'p8w2n5c7e1fg.md', title: 'Eventos' },
            ],
            'Local',
            'ws',
        );

        expect(entries).toEqual([
            {
                name: 'Pedidos',
                resource: 'mandor://local/ws/doc/k3m9x2q7a4bd.md',
                source: 'doc',
                tags: [],
                trail: '',
            },
            {
                name: 'Eventos',
                resource: 'mandor://local/ws/doc/p8w2n5c7e1fg.md',
                source: 'doc',
                tags: [],
                trail: '',
            },
        ]);
    });
});
