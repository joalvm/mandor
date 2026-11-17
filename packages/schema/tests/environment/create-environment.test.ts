import { describe, expect, it } from 'vitest';

import { createEnvironment, FormatError, parseEnvironment } from '../../src/index.js';

describe('createEnvironment', () => {
    it('returns an environment that passes its own parse, under the id it was given', () => {
        const environment = createEnvironment({ id: 'x4k9m2q7w1c3', name: 'Local' });

        expect(parseEnvironment(environment)).toEqual(environment);
        expect(environment.id).toBe('x4k9m2q7w1c3');
        expect(environment.name).toBe('Local');
        expect(environment.variables).toEqual([]);
    });

    it('keeps the variables given', () => {
        const environment = createEnvironment({
            id: 'local',
            name: 'Local',
            variables: [{ name: 'host', value: 'localhost:8080', enabled: true, secret: false }],
        });

        expect(environment.variables).toEqual([
            { name: 'host', value: 'localhost:8080', enabled: true, secret: false },
        ]);
    });

    it('rejects an id that could leave its folder', () => {
        expect(() => createEnvironment({ id: '../local', name: 'Local' })).toThrow(FormatError);
    });

    it('rejects a variable name the placeholder syntax cannot hold', () => {
        expect(() =>
            createEnvironment({
                id: 'local',
                name: 'Local',
                variables: [{ name: '$uuid', value: 'x', enabled: true, secret: false }],
            }),
        ).toThrow(FormatError);
    });

    it('does not retain the mutable variables passed by the caller', () => {
        const variable = { name: 'host', value: 'a', enabled: true, secret: false };
        const environment = createEnvironment({
            id: 'local',
            name: 'Local',
            variables: [variable],
        });

        variable.value = 'changed';

        expect(environment.variables).toEqual([
            { name: 'host', value: 'a', enabled: true, secret: false },
        ]);
    });
});
