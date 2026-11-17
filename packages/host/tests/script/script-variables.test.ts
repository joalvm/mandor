import { describe, expect, it } from 'vitest';

import { createScriptVariables } from '../../src/script/script-variables.js';

const HERE = { origin: 'local', workspaceId: 'ws', environmentId: 'dev' };
const LIMITS = { variables: 2, variableBytes: 4, variablesBytes: 10 };

describe('createScriptVariables', () => {
    it('keeps what a run set in its place only, the last write of a name winning', () => {
        const variables = createScriptVariables();
        const started = variables.generation(HERE);

        expect(
            variables.apply(HERE, started, [
                { name: 'a', value: '1' },
                { name: 'b', value: '2' },
                { name: 'a', value: '3' },
            ]),
        ).toBe('applied');
        expect(variables.values(HERE)).toEqual({ a: '3', b: '2' });
        expect(variables.values({ ...HERE, environmentId: null })).toEqual({});
        expect(variables.values({ ...HERE, workspaceId: 'other' })).toEqual({});
        expect(variables.values({ ...HERE, origin: 'other' })).toEqual({});
    });

    it('keeps the values of no environment apart from those of each environment', () => {
        const variables = createScriptVariables();
        const none = { ...HERE, environmentId: null };

        variables.apply(none, variables.generation(none), [{ name: 'a', value: 'none' }]);
        variables.apply(HERE, variables.generation(HERE), [{ name: 'a', value: 'dev' }]);

        expect(variables.values(none)).toEqual({ a: 'none' });
        expect(variables.values(HERE)).toEqual({ a: 'dev' });
    });

    it('drops what a run that started before a clear brings, and clears every environment', () => {
        const variables = createScriptVariables();
        const none = { ...HERE, environmentId: null };
        const started = variables.generation(HERE);

        variables.apply(HERE, started, [{ name: 'a', value: '1' }]);
        variables.apply(none, started, [{ name: 'a', value: '1' }]);
        variables.clear({ origin: 'local', workspaceId: 'ws' });

        expect(variables.values(HERE)).toEqual({});
        expect(variables.values(none)).toEqual({});
        expect(variables.apply(HERE, started, [{ name: 'b', value: '2' }])).toBe('stale');
        expect(variables.values(HERE)).toEqual({});
        expect(variables.apply(HERE, variables.generation(HERE), [{ name: 'b', value: '2' }])).toBe(
            'applied',
        );
    });

    it('leaves the other workspaces alone when one is cleared', () => {
        const variables = createScriptVariables();
        const other = { ...HERE, workspaceId: 'other' };
        const started = variables.generation(other);

        variables.apply(other, started, [{ name: 'a', value: '1' }]);
        variables.clear({ origin: 'local', workspaceId: 'ws' });

        expect(variables.values(other)).toEqual({ a: '1' });
        expect(variables.apply(other, started, [{ name: 'b', value: '2' }])).toBe('applied');
    });

    it('drops every value and moves every place on when the approvals are forgotten', () => {
        const variables = createScriptVariables();
        const other = { ...HERE, workspaceId: 'other' };

        variables.apply(other, variables.generation(other), [{ name: 'kept', value: '1' }]);

        const here = variables.generation(HERE);
        const there = variables.generation(other);

        variables.forget();

        expect(variables.values(other)).toEqual({});
        expect(variables.apply(HERE, here, [{ name: 'a', value: '1' }])).toBe('stale');
        expect(variables.apply(other, there, [{ name: 'a', value: '1' }])).toBe('stale');
    });

    it('refuses the whole run when its values do not fit, and keeps what was there', () => {
        const variables = createScriptVariables(LIMITS);
        const at = (): number => variables.generation(HERE);

        variables.apply(HERE, at(), [{ name: 'a', value: '1' }]);

        expect(variables.apply(HERE, at(), [{ name: 'b', value: '12345' }])).toBe('full');
        expect(
            variables.apply(HERE, at(), [
                { name: 'b', value: '2' },
                { name: 'c', value: '3' },
            ]),
        ).toBe('full');
        expect(variables.apply(HERE, at(), [{ name: 'bbbbb', value: '1234' }])).toBe('full');
        expect(variables.values(HERE)).toEqual({ a: '1' });
        expect(variables.apply(HERE, at(), [{ name: 'a', value: '1234' }])).toBe('applied');
    });
});
