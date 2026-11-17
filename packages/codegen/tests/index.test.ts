import { describe, expect, it } from 'vitest';

import { SnippetError, curlRequestOf, snippetOf } from '../src/index.js';

describe('the barrel of codegen', () => {
    it('states what reads a curl command', () => {
        expect(curlRequestOf('curl https://h').kind).toBe('parsed');
    });

    it('states what writes a snippet, and the error it can fail with', () => {
        const request = {
            method: 'GET',
            url: 'https://h.example.test',
            headers: [],
            body: { type: 'none' },
        } as const;

        expect(snippetOf({ ...request, headers: [] }, 'curl', {})).toContain('h.example.test');
        expect(new SnippetError('curl')).toBeInstanceOf(Error);
    });
});
