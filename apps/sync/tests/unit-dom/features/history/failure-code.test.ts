import { describe, expect, it } from 'vitest';

import { failureCodeOf } from '../../../../src/renderer/features/history/lib/failure-code.js';

describe('the code of a stored failure', () => {
    it('is the same code when this version knows it', () => {
        expect(failureCodeOf('request-timeout')).toBe('request-timeout');
    });

    it('reads as the unknown error when a later version wrote a code this one lacks', () => {
        expect(failureCodeOf('request-from-the-future')).toBe('unknown');
    });
});
