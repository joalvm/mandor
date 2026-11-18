import type { ImportResource } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { heldOf, holdSecrets, type HeldSecrets } from '../../src/import/held-secrets.js';

function resource(fields: Record<string, unknown>): ImportResource {
    return {
        place: 'environment',
        itemKind: null,
        route: 'prod',
        name: 'Prod',
        fields,
        origin: { kind: 'postman', sourceId: 'doc' },
        degradations: [],
    };
}

const SECRET = { name: 'token', value: 'shh', enabled: true, secret: true };
const PLAIN = { name: 'base', value: 'x', enabled: true, secret: false };

describe('holdSecrets', () => {
    it('takes the values of the secrets out of the resource and holds them', () => {
        const held: HeldSecrets = new Map();
        const [out] = holdSecrets([resource({ variables: [SECRET, PLAIN] })], held);

        expect(out?.fields['variables']).toEqual([{ ...SECRET, value: '' }, PLAIN]);
        expect(heldOf(held, resource({}))).toEqual([{ name: 'token', value: 'shh' }]);
    });

    it('leaves alone what carries no value of a secret', () => {
        const held: HeldSecrets = new Map();
        const each = [
            resource({ url: 'x' }),
            resource({ variables: 'not a list' }),
            resource({ variables: [PLAIN, { ...SECRET, value: '' }] }),
        ];

        expect(holdSecrets(each, held)).toEqual(each);
        expect(held.size).toBe(0);
        expect(heldOf(held, resource({}))).toEqual([]);
    });

    it('forgets the plan before it when a new one is built', () => {
        const held: HeldSecrets = new Map();

        holdSecrets([resource({ variables: [SECRET] })], held);
        holdSecrets([], held);

        expect(held.size).toBe(0);
    });
});
