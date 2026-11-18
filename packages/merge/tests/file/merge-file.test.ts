import { describe, expect, it } from 'vitest';

import { mergeFile } from '../../src/file/merge-file.js';
import { requestText } from '../fixtures/request-text.js';

describe('merging a file when a side did not move', () => {
    it('gives the same text back when both sides ended equal', () => {
        const input = { path: 'a.yaml', base: 'a: 1\n', ours: 'a: 2\n', theirs: 'a: 2\n' };

        expect(mergeFile(input)).toEqual({ text: 'a: 2\n', conflicts: [] });
    });

    it('takes what the other side did when this one did not move', () => {
        const base = 'a: 1\n';

        expect(mergeFile({ path: 'a.yaml', base, ours: base, theirs: 'a: 2\n' }).text).toBe(
            'a: 2\n',
        );
        expect(mergeFile({ path: 'a.yaml', base, ours: 'a: 3\n', theirs: base }).text).toBe(
            'a: 3\n',
        );
    });

    it('follows a deletion nobody contested, and a creation nobody contested', () => {
        const base = 'a: 1\n';

        expect(mergeFile({ path: 'a.yaml', base, ours: base, theirs: null }).text).toBeNull();
        expect(mergeFile({ path: 'a.yaml', base: null, ours: null, theirs: base }).text).toBe(base);
        expect(mergeFile({ path: 'a.yaml', base: null, ours: base, theirs: null }).text).toBe(base);
    });
});

describe('merging a file one side deleted', () => {
    it.each([
        ['ours', null, 'a: 2\n'],
        ['theirs', 'a: 2\n', null],
    ])('asks when %s deleted what the other changed', (_side, ours, theirs) => {
        const result = mergeFile({ path: 'a.yaml', base: 'a: 1\n', ours, theirs });

        expect(result.text).toBe(ours);
        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0]).toMatchObject({ id: '', shape: 'file' });
    });
});

describe('merging by the kind of file', () => {
    it('reads the extension in any case', () => {
        const result = mergeFile({
            path: 'workspaces/a/requests/Login.YAML',
            base: requestText(),
            ours: requestText({ method: 'PUT' }),
            theirs: requestText({ secondAccept: 'text/html' }),
        });

        expect(result.text).toBe(requestText({ method: 'PUT', secondAccept: 'text/html' }));
    });

    it('merges a document by lines and asks about it when a line clashes', () => {
        const base = 'one\ntwo\nthree\nfour\nfive\n';
        const clean = mergeFile({
            path: 'docs/readme.md',
            base,
            ours: 'ONE\ntwo\nthree\nfour\nfive\n',
            theirs: 'one\ntwo\nthree\nfour\nFIVE\n',
        });
        const clash = mergeFile({
            path: 'docs/readme.md',
            base,
            ours: 'ONE\ntwo\nthree\nfour\nfive\n',
            theirs: 'uno\ntwo\nthree\nfour\nfive\n',
        });

        expect(clean).toEqual({ text: 'ONE\ntwo\nthree\nfour\nFIVE\n', conflicts: [] });
        expect(clash.text).toBe('ONE\ntwo\nthree\nfour\nfive\n');
        expect(clash.conflicts[0]).toMatchObject({ id: '', shape: 'text' });
    });

    it('merges two documents created on both sides as lines against nothing', () => {
        const result = mergeFile({ path: 'a.md', base: null, ours: 'x\n', theirs: 'y\n' });

        expect(result.conflicts[0]).toMatchObject({ shape: 'text' });
    });

    it.each(['image.png', 'LICENSE', 'dir.d/file'])('does not guess at %s', (path) => {
        const result = mergeFile({ path, base: 'a', ours: 'b', theirs: 'c' });

        expect(result.text).toBe('b');
        expect(result.conflicts[0]).toMatchObject({ id: '', shape: 'file' });
    });
});
