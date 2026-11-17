import { describe, expect, it } from 'vitest';

import {
    headerAutoRowOf,
    headerAutoSectionOf,
} from '../../../../src/renderer/features/requests/lib/header-auto-row.js';

function labels(key: string): string {
    return `<${key}>`;
}

describe('a header the request adds by itself, as the table says it', () => {
    it('says why it is there, and links to the tab that decides it', () => {
        const auth = {
            id: 'auth',
            kind: 'auth' as const,
            name: 'Authorization',
            value: 'Bearer x',
        };

        expect(headerAutoRowOf(auth, labels)).toEqual({
            calculated: undefined,
            description: '<headerAutoAuth>',
            follow: { label: '<headerAutoAuthFollow>' },
            id: 'auth',
            locked: true,
            name: 'Authorization',
            overriddenBy: undefined,
            value: 'Bearer x',
        });
        expect(headerAutoSectionOf([auth], 'auth')).toBe('auth');
    });

    it('a default only says what it is for, and leads nowhere', () => {
        const accept = { id: 'accept', kind: 'default' as const, name: 'Accept', value: '*/*' };
        const odd = { id: 'odd', kind: 'wire' as const, name: 'X-Odd', value: '1' };

        expect(headerAutoRowOf(accept, labels).description).toBe('<headerAutoAccept>');
        expect(headerAutoRowOf(odd, labels).description).toBe('');
        expect(headerAutoSectionOf([accept], 'accept')).toBeUndefined();
        expect(headerAutoSectionOf([accept], 'missing')).toBeUndefined();
    });
});
