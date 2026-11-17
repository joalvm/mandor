import { describe, expect, it } from 'vitest';

import { resolveFile } from '../../src/choice/resolve-file.js';
import { mergeFile } from '../../src/file/merge-file.js';
import { contentWith, requestText } from '../fixtures/request-text.js';

const BASE = requestText();
const OURS = requestText({
    secondAccept: 'text/html',
    content: contentWith({ 1: '  "user": "ana",' }),
});
const THEIRS = requestText({
    secondAccept: 'text/csv',
    content: contentWith({ 1: '  "user": "bea",' }),
});
const INPUT = { path: 'requests/login.yaml', base: BASE, ours: OURS, theirs: THEIRS };

describe('resolving the questions of a merge', () => {
    it('asks first for the row and for the body, each under its own id', () => {
        const asked = mergeFile(INPUT);

        expect(asked.conflicts.map((conflict) => conflict.id)).toEqual([
            'headers/Accept#1',
            'body/content',
        ]);
    });

    it('answers each question with its choice and leaves none open', () => {
        const resolved = resolveFile(INPUT, {
            'headers/Accept#1': { pick: 'theirs' },
            'body/content': { text: '{}\n' },
        });

        expect(resolved.conflicts).toEqual([]);
        expect(resolved.text).toBe(requestText({ secondAccept: 'text/csv', content: ['{}'] }));
    });

    it('answers with ours when the user picks ours, so the file stays as it was', () => {
        const resolved = resolveFile(INPUT, {
            'headers/Accept#1': { pick: 'ours' },
            'body/content': { pick: 'ours' },
        });

        expect(resolved).toEqual({ text: OURS, conflicts: [] });
    });

    it('keeps open what has no choice, and ignores a choice that has no question', () => {
        const resolved = resolveFile(INPUT, {
            'headers/Accept#1': { pick: 'theirs' },
            'nothing/here': { pick: 'theirs' },
        });

        expect(resolved.conflicts.map((conflict) => conflict.id)).toEqual(['body/content']);
        expect(resolved.text).toContain('text/csv');
    });

    it('does not take written text for a row, which is picked', () => {
        const resolved = resolveFile(INPUT, { 'headers/Accept#1': { text: 'x' } });

        expect(resolved.conflicts.map((conflict) => conflict.id)).toContain('headers/Accept#1');
    });

    it('does not read an id off the prototype of the choices', () => {
        const resolved = resolveFile(
            {
                path: 'a.yaml',
                base: 'constructor: 1\n',
                ours: 'constructor: 2\n',
                theirs: 'constructor: 3\n',
            },
            {},
        );

        expect(resolved.conflicts.map((conflict) => conflict.id)).toEqual(['constructor']);
    });

    it('resolves a file one side deleted by picking the side', () => {
        const input = { path: 'a.yaml', base: 'a: 1\n', ours: null, theirs: 'a: 2\n' };

        expect(resolveFile(input, { '': { pick: 'theirs' } })).toEqual({
            text: 'a: 2\n',
            conflicts: [],
        });
        expect(resolveFile(input, { '': { pick: 'ours' } })).toEqual({
            text: null,
            conflicts: [],
        });
    });
});
