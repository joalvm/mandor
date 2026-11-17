import { describe, expect, it } from 'vitest';

import { forgetTexts, knownText, rememberGone, rememberText } from '../../src/repo/known-texts.js';

describe('what the window believes a file says', () => {
    it('is unknown for a path nobody told the window about', () => {
        expect(knownText('/r1', 'a.yaml')).toBeUndefined();
    });

    it('keeps the last text, and `null` for a file the window thinks is not there', () => {
        rememberText('/r2', 'a.yaml', 'one\n');
        rememberText('/r2', 'a.yaml', 'two\n');
        rememberText('/r2', 'b.yaml', null);

        expect(knownText('/r2', 'a.yaml')).toBe('two\n');
        expect(knownText('/r2', 'b.yaml')).toBeNull();
    });

    it('keeps one repo apart from another', () => {
        rememberText('/r3', 'a.yaml', 'three\n');

        expect(knownText('/r4', 'a.yaml')).toBeUndefined();
    });

    it('forgets every path of a repo and only of that one', () => {
        rememberText('/r5', 'a.yaml', 'five\n');
        rememberText('/r6', 'a.yaml', 'six\n');

        forgetTexts('/r5');

        expect(knownText('/r5', 'a.yaml')).toBeUndefined();
        expect(knownText('/r6', 'a.yaml')).toBe('six\n');
    });

    it('takes a folder away with the files the window believed were in it', () => {
        rememberText('/r7', 'dir/a.yaml', 'seven\n');
        rememberText('/r7', 'dir-other/b.yaml', 'eight\n');

        rememberGone('/r7', 'dir');

        expect(knownText('/r7', 'dir')).toBeNull();
        expect(knownText('/r7', 'dir/a.yaml')).toBeNull();
        expect(knownText('/r7', 'dir-other/b.yaml')).toBe('eight\n');
    });

    it('notes a path gone even in a repo it never heard of', () => {
        rememberGone('/r8', 'a.yaml');

        expect(knownText('/r8', 'a.yaml')).toBeNull();
    });
});
