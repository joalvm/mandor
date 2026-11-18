import { describe, expect, it } from 'vitest';

import { FormatVersionError, REPO_FORMAT } from '../../src/index.js';

describe('FormatVersionError', () => {
    it('carries the found and supported versions', () => {
        const error = new FormatVersionError(99, REPO_FORMAT);

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('FormatVersionError');
        expect(error.found).toBe(99);
        expect(error.supported).toBe(REPO_FORMAT);
    });
});
