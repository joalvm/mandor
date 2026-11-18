import { describe, expect, it } from 'vitest';

import { plainVariableSchema } from '../../src/environment/plain-variable-schema.js';

const variable = { name: 'host', value: '127.0.0.1', enabled: true, secret: false };

describe('plainVariableSchema', () => {
    it('accepts a plain variable', () => {
        expect(plainVariableSchema.parse(variable)).toEqual(variable);
    });

    it('rejects a secret one: the file goes to git and a secret needs an environment', () => {
        expect(plainVariableSchema.safeParse({ ...variable, secret: true }).success).toBe(false);
    });
});
