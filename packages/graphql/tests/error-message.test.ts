import { describe, expect, it } from 'vitest';

import { errorMessage } from '../src/error-message.js';

describe('what a thrown value says', () => {
    it('is the message of an error', () => {
        expect(errorMessage(new Error('no good'))).toBe('no good');
    });

    it('is what anything else prints as', () => {
        expect(errorMessage('plain')).toBe('plain');
        expect(errorMessage(42)).toBe('42');
    });
});
