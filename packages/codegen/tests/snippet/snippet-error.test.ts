import { describe, expect, it } from 'vitest';

import { SnippetError } from '../../src/snippet/snippet-error.js';

describe('the error of a snippet the library did not write', () => {
    it('carries the language it was asked for', () => {
        const error = new SnippetError('go-native');

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('SnippetError');
        expect(error.target).toBe('go-native');
        expect(error.message).toBe('the snippet library wrote nothing for go-native');
    });
});
