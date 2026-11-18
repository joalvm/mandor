import { describe, expect, it } from 'vitest';

import { postmanEnvironmentSchema } from '../../../src/postman/document/postman-environment-schema.js';
import { fixtureJson } from '../support/fixture.js';

describe('postmanEnvironmentSchema', () => {
    it('reads an environment and keeps the keys it does not name', () => {
        const read = postmanEnvironmentSchema.parse(fixtureJson('environment.json'));

        expect(read.values).toHaveLength(3);
        expect(read['_postman_exported_at']).toBe('2026-09-01T10:00:00.000Z');
    });

    it('reads globals and a value that is not text', () => {
        const read = postmanEnvironmentSchema.parse({
            name: 'g',
            values: [{ key: 'n', value: 3 }],
            _postman_variable_scope: 'globals',
        });

        expect(read.values[0]?.value).toBe(3);
    });

    it('refuses a file with no name, or with a scope that is neither', () => {
        const values: unknown[] = [];
        const noName = { values, _postman_variable_scope: 'globals' };
        const badScope = { name: 'x', values, _postman_variable_scope: 'x' };

        expect(postmanEnvironmentSchema.safeParse(noName).success).toBe(false);
        expect(postmanEnvironmentSchema.safeParse(badScope).success).toBe(false);
    });
});
