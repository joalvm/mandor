import { describe, expect, it } from 'vitest';

import { gitErrorCodeOf } from '../../src/git/git-error-code.js';

describe('mapping a git failure to a code', () => {
    /** The binary is absent, so the app has to keep working without version control. */
    it('reports a missing binary when the process could not be spawned', () => {
        expect(gitErrorCodeOf(new Error('spawn git ENOENT'))).toBe('git-missing');
    });

    it('reports a missing repository when git refuses the directory', () => {
        const failure = new Error('fatal: not a git repository (or any of the parent directories)');

        expect(gitErrorCodeOf(failure)).toBe('git-not-a-repo');
    });

    it('falls back to a generic failure for anything else git refuses', () => {
        expect(gitErrorCodeOf(new Error('fatal: unknown option `--nonsense`'))).toBe('git-failed');
    });

    it('falls back to a generic failure when what was thrown is not an error', () => {
        expect(gitErrorCodeOf('boom')).toBe('git-failed');
    });
});
