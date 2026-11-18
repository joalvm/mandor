import { describe, expect, it } from 'vitest';

import { slugSchema } from '../../src/fields/slug-schema.js';
import { newId } from '../../src/id/new-id.js';
import { SEGMENT } from '../../src/id/segment-pattern.js';

describe('minting an id', () => {
    it('maps each random byte to one symbol of the alphabet, with no bias', () => {
        const id = newId((bytes) => bytes.fill(0).map((_, index) => index));

        expect(id).toBe('0123456789ab');
        expect(newId((bytes) => bytes.fill(255))).toBe('zzzzzzzzzzzz');
    });

    it('is 12 symbols long', () => {
        expect(newId()).toHaveLength(12);
    });

    it('always passes the check every segment of a path goes through', () => {
        const ids = Array.from({ length: 1000 }, () => newId());

        expect(ids.every((id) => slugSchema.safeParse(id).success && SEGMENT.test(id))).toBe(true);
    });

    it('does not repeat itself', () => {
        const ids = new Set(Array.from({ length: 1000 }, () => newId()));

        expect(ids.size).toBe(1000);
    });
});
