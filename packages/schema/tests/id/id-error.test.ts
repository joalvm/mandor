import { describe, expect, it } from 'vitest';

import { IdError } from '../../src/id/id-error.js';
import { slugify } from '../../src/id/slugify.js';

describe('IdError', () => {
    it('carries the offending value so the UI can quote it', () => {
        const error = new IdError('../fuera');

        expect(error.value).toBe('../fuera');
        expect(error.message).toBe('Invalid id: "../fuera"');
    });

    it('is an Error that names itself', () => {
        const error = new IdError('x');

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('IdError');
    });

    it('is what slugify throws for a name with nothing to build an id from', () => {
        expect(() => slugify('???')).toThrow(IdError);
    });
});
