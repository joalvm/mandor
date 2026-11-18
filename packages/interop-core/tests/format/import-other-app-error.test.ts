import { describe, expect, it } from 'vitest';

import { ImportOtherAppError } from '../../src/format/import-other-app-error.js';

describe('ImportOtherAppError', () => {
    it('names the two apps', () => {
        const error = new ImportOtherAppError('async', 'sync');

        expect(error.found).toBe('async');
        expect(error.expected).toBe('sync');
        expect(error.message).toContain('async');
        expect(error.name).toBe('ImportOtherAppError');
    });
});
