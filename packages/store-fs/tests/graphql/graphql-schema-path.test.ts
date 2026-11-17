import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { graphqlSchemaDir, graphqlSchemaFile } from '../../src/graphql/graphql-schema-path.js';

const KEY = 'a'.repeat(64);

describe('where the schemas of a workspace live', () => {
    it('keeps one folder per workspace under .mandor, which never goes to git', () => {
        expect(graphqlSchemaDir('/repo', 'pagos')).toBe(
            join('/repo', '.mandor', 'graphql', 'pagos'),
        );
    });

    it('refuses a workspace that is not an id segment', () => {
        expect(() => graphqlSchemaDir('/repo', '../pagos')).toThrow();
    });

    it('names a file by its key', () => {
        expect(graphqlSchemaFile('/repo', 'pagos', KEY)).toBe(
            join('/repo', '.mandor', 'graphql', 'pagos', `${KEY}.json`),
        );
    });

    it.each(['', '../x', 'abc', 'A'.repeat(64), 'a'.repeat(63), `${KEY}/..`])(
        'refuses `%s` as a key',
        (key) => {
            expect(() => graphqlSchemaFile('/repo', 'pagos', key)).toThrow();
        },
    );
});
