import { describe, expect, it } from 'vitest';

import { awsEncode, canonicalPath, canonicalQuery } from '../../src/auth/aws-canonical.js';

describe('the canonical parts of an AWS signature', () => {
    it('encodes everything but the unreserved characters', () => {
        expect(awsEncode("a b!'()*~._-/ñ")).toBe('a%20b%21%27%28%29%2A~._-%2F%C3%B1');
    });

    it('encodes each segment of the path twice, except for S3', () => {
        expect(canonicalPath('/a%20b/c', 'execute-api')).toBe('/a%2520b/c');
        expect(canonicalPath('/a%20b/c', 's3')).toBe('/a%20b/c');
        expect(canonicalPath('', 's3')).toBe('/');
    });

    it('sorts the query by key and then by value, every pair encoded', () => {
        expect(canonicalQuery(new URLSearchParams('b=2&a=z&a=y&c=x+y&d'))).toBe(
            'a=y&a=z&b=2&c=x%20y&d=',
        );
    });
});
