import { describe, expect, it } from 'vitest';

import { schemaKey } from '../../../../src/main/graphql/schema-key.js';

describe('naming the schema kept for a server', () => {
    it('is a sha-256 in lowercase hex, which a file name can hold', () => {
        expect(schemaKey('http://a.test/graphql', 'local')).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is the same for the same url in the same environment', () => {
        expect(schemaKey('http://a.test/graphql', 'local')).toBe(
            schemaKey('http://a.test/graphql', 'local'),
        );
    });

    it('tells one environment from another, and from none', () => {
        const keys = [
            schemaKey('http://a.test/graphql', 'local'),
            schemaKey('http://a.test/graphql', 'staging'),
            schemaKey('http://a.test/graphql', null),
        ];

        expect(new Set(keys).size).toBe(3);
    });

    it('tells one url from another', () => {
        expect(schemaKey('http://a.test/graphql', null)).not.toBe(
            schemaKey('http://b.test/graphql', null),
        );
    });

    it('does not let the url and the environment run into each other', () => {
        expect(schemaKey('http://a.test/graphql\nlocal', null)).not.toBe(
            schemaKey('http://a.test/graphql', 'local'),
        );
    });
});
