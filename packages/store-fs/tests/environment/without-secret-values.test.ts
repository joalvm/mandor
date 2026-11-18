import type { Variable } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { withoutSecretValues } from '../../src/environment/without-secret-values.js';

function variable(name: string, value: string, secret: boolean): Variable {
    return { name, value, enabled: true, secret };
}

describe('keeping secret values out of a file that travels', () => {
    it('empties the value of a variable marked secret and keeps its name and mark', () => {
        const next = { id: 'prod', variables: [variable('token', 'abc', true)] };

        expect(withoutSecretValues(next, null).variables).toEqual([variable('token', '', true)]);
    });

    it('leaves a plain variable as it was', () => {
        const next = { id: 'prod', variables: [variable('host', 'localhost', false)] };

        expect(withoutSecretValues(next, null).variables).toEqual([
            variable('host', 'localhost', false),
        ]);
    });

    /** Unmarking the box is not a way to walk a token back into a file that travels. */
    it('empties a variable that was secret before, even when it is not any more', () => {
        const previous = { variables: [variable('token', '', true)] };
        const next = { variables: [variable('token', 'abc', false)] };

        expect(withoutSecretValues(next, previous).variables).toEqual([
            variable('token', '', false),
        ]);
    });

    it('does not empty a variable that was plain before and is still plain', () => {
        const previous = { variables: [variable('host', 'a', false)] };
        const next = { variables: [variable('host', 'b', false)] };

        expect(withoutSecretValues(next, previous).variables).toEqual([
            variable('host', 'b', false),
        ]);
    });

    it('keeps the rest of what it was given and does not change the input', () => {
        const next = { id: 'prod', name: 'Prod', variables: [variable('token', 'abc', true)] };

        const kept = withoutSecretValues(next, null);

        expect(kept.id).toBe('prod');
        expect(kept.name).toBe('Prod');
        expect(next.variables[0]?.value).toBe('abc');
    });
});
