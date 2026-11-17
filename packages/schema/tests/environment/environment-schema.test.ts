import { describe, expect, it } from 'vitest';

import { environmentSchema } from '../../src/environment/environment-schema.js';

const LOCAL = {
    id: 'local',
    name: 'Local',
    variables: [{ name: 'host', value: 'localhost', enabled: true, secret: false }],
};

describe('environmentSchema', () => {
    it('reads an environment with its variables', () => {
        expect(environmentSchema.parse(LOCAL)).toEqual(LOCAL);
    });

    it('reads the origin an import left, when there is one', () => {
        const imported = { ...LOCAL, origin: { kind: 'postman', sourceId: 'env-1' } };

        expect(environmentSchema.parse(imported)).toEqual(imported);
    });

    it('refuses an id that is not one id segment', () => {
        expect(environmentSchema.safeParse({ ...LOCAL, id: 'Local Env' }).success).toBe(false);
    });

    it('refuses a name made of whitespace only', () => {
        expect(environmentSchema.safeParse({ ...LOCAL, name: '  ' }).success).toBe(false);
    });

    it('refuses a variable with a name that could not sit inside {{...}}', () => {
        const stray = {
            ...LOCAL,
            variables: [{ name: '$dynamic', value: '', enabled: true, secret: false }],
        };

        expect(environmentSchema.safeParse(stray).success).toBe(false);
    });

    it('refuses an environment with no list of variables', () => {
        expect(environmentSchema.safeParse({ id: 'local', name: 'Local' }).success).toBe(false);
    });
});
