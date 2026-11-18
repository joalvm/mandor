import { degradation, type ImportPlan, type Degradation } from '@mandor/interop-core';
import type { Variable } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { withGlobalClashes } from '../../src/import/global-clashes.js';

function variable(name: string, value: string, secret = false): Variable {
    return { name, value, enabled: true, secret };
}

const PROPIA = degradation('pkceAlways');

function planOf(variables: unknown, degradations: Degradation[] = []): ImportPlan {
    return {
        identity: { kind: 'postman', sourceId: 'a' },
        entries: [
            {
                class: 'add',
                place: 'globals',
                route: '.',
                name: 'Globales',
                selected: true,
                resource: {
                    place: 'globals',
                    itemKind: null,
                    route: '.',
                    name: 'Globales',
                    fields: { variables },
                    origin: { kind: 'postman', sourceId: 'a' },
                    degradations,
                },
            },
        ],
    };
}

function notesOf(plan: ImportPlan): Degradation[] | undefined {
    return plan.entries[0]?.resource?.degradations;
}

describe('withGlobalClashes', () => {
    it('says which names come with another value and stay as they are', () => {
        const plan = planOf(
            [variable('a', 'nuevo'), variable('b', 'igual'), variable('c', 'x')],
            [PROPIA],
        );
        const said = withGlobalClashes(plan, [variable('a', 'viejo'), variable('b', 'igual')]);

        expect(notesOf(said)).toEqual([PROPIA, degradation('globalsKept', { names: 'a' })]);
    });

    it('says nothing of a secret, which brings no value to compare', () => {
        const plan = planOf([variable('token', '', true)]);

        expect(notesOf(withGlobalClashes(plan, [variable('token', 'guardado', true)]))).toEqual([]);
    });

    it('leaves alone an entry that is not of globals, or carries nothing readable', () => {
        const plan = planOf('no es una lista');
        const removal: ImportPlan = {
            ...plan,
            entries: [
                {
                    class: 'removal',
                    place: 'connection',
                    route: 'x',
                    name: 'x',
                    resource: null,
                    selected: false,
                },
            ],
        };

        expect(withGlobalClashes(plan, [variable('a', 'b')])).toEqual(plan);
        expect(withGlobalClashes(removal, [variable('a', 'b')])).toEqual(removal);
    });
});
