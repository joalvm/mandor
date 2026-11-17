import { describe, expect, it } from 'vitest';

import { FormatError, parseRepo } from '../../src/index.js';

describe('FormatError', () => {
    it('carries the list of issue paths', () => {
        const error = catchFormatError(() => {
            parseRepo({ formatVersion: 'uno', name: 42, workspaces: [] });
        });

        expect(error.name).toBe('FormatError');
        expect(error.issues).toContain('formatVersion');
        expect(error.issues).toContain('name');
    });
});

function catchFormatError(run: () => void): FormatError {
    try {
        run();
    } catch (error) {
        if (error instanceof FormatError) {
            return error;
        }

        throw error;
    }

    throw new Error('Expected FormatError, got none');
}
