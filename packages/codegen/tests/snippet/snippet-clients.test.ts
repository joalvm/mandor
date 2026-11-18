import { SNIPPET_TARGETS } from '@mandor/schema';
import { availableTargets } from '@readme/httpsnippet';
import { describe, expect, it } from 'vitest';

import { SNIPPET_CLIENTS, type LibraryTarget } from '../../src/snippet/snippet-clients.js';

const WRITTEN_BY_HAND = new Set([
    'curl',
    'curl-cmd',
    'php-curl',
    'powershell-webrequest',
    'js-fetch',
    'node-axios',
]);
const LIBRARY_TARGETS = SNIPPET_TARGETS.filter(
    (target): target is LibraryTarget => !WRITTEN_BY_HAND.has(target),
);

describe('the library client each language is written with', () => {
    it('names one for every language the dialog lists but those written by hand', () => {
        expect(Object.keys(SNIPPET_CLIENTS).sort()).toEqual(LIBRARY_TARGETS.sort());
    });

    it.each(LIBRARY_TARGETS)('finds the client of %s in the library', (target) => {
        const { target: id, client } = SNIPPET_CLIENTS[target];
        const found = availableTargets().find((available) => available.key === id);

        expect(found?.clients.map((info) => info.key)).toContain(client);
    });
});
