import { describe, expect, it } from 'vitest';

import { NO_DECISION } from '../../src/choice/settle-conflict.js';
import { mergeYaml } from '../../src/yaml/merge-yaml.js';
import { contentWith, requestText } from '../fixtures/request-text.js';

function merged(base: string, ours: string, theirs: string): ReturnType<typeof mergeYaml> {
    return mergeYaml({ base, ours, theirs }, NO_DECISION);
}

describe('merging a request file', () => {
    it('joins a method changed here with a header changed there, comment and quotes kept', () => {
        const result = merged(
            requestText(),
            requestText({ method: 'PUT' }),
            requestText({ secondAccept: 'text/html' }),
        );

        expect(result.conflicts).toEqual([]);
        expect(result.text).toBe(requestText({ method: 'PUT', secondAccept: 'text/html' }));
        expect(result.text).toContain('# Login request');
    });

    it('joins the edits of two sides in different lines of the body', () => {
        const result = merged(
            requestText(),
            requestText({ content: contentWith({ 1: '  "user": "ana",' }) }),
            requestText({ content: contentWith({ 4: '  "y": 3' }) }),
        );

        expect(result.conflicts).toEqual([]);
        expect(result.text).toBe(
            requestText({ content: contentWith({ 1: '  "user": "ana",', 4: '  "y": 3' }) }),
        );
    });

    it('asks about the body when both sides edited the same line, and keeps ours meanwhile', () => {
        const ours = requestText({ content: contentWith({ 1: '  "user": "ana",' }) });
        const result = merged(
            requestText(),
            ours,
            requestText({ content: contentWith({ 1: '  "user": "bea",' }) }),
        );

        expect(result.text).toBe(ours);
        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0]).toMatchObject({ id: 'body/content', shape: 'text' });
    });

    it('asks about the row when both sides edited the same header', () => {
        const ours = requestText({ secondAccept: 'text/html' });
        const result = merged(requestText(), ours, requestText({ secondAccept: 'text/csv' }));

        expect(result.text).toBe(ours);
        expect(result.conflicts[0]).toMatchObject({ id: 'headers/Accept#1', shape: 'row' });
    });

    it('answers a row with the side the user picked', () => {
        const result = mergeYaml(
            {
                base: requestText(),
                ours: requestText({ secondAccept: 'text/html' }),
                theirs: requestText({ secondAccept: 'text/csv' }),
            },
            () => ({ pick: 'theirs' }),
        );

        expect(result.conflicts).toEqual([]);
        expect(result.text).toBe(requestText({ secondAccept: 'text/csv' }));
    });

    it('answers the body with the text the user wrote', () => {
        const result = mergeYaml(
            {
                base: requestText(),
                ours: requestText({ content: contentWith({ 1: '  "user": "ana",' }) }),
                theirs: requestText({ content: contentWith({ 1: '  "user": "bea",' }) }),
            },
            () => ({ text: '{}\n' }),
        );

        expect(result.conflicts).toEqual([]);
        expect(result.text).toBe(requestText({ content: ['{}'] }));
    });
});

describe('merging the files of other entities', () => {
    it('adds the variable one side created to the ones the other side edited', () => {
        const variable = (name: string, value: string): string =>
            `  - name: ${name}\n    value: ${value}\n    enabled: true\n    secret: false\n`;
        const file = (...rows: string[]): string => `name: Dev\nvariables:\n${rows.join('')}`;
        const result = merged(
            file(variable('host', 'a')),
            file(variable('host', 'b')),
            file(variable('host', 'a'), variable('token', 'x')),
        );

        expect(result.conflicts).toEqual([]);
        expect(result.text).toBe(file(variable('host', 'b'), variable('token', 'x')));
    });

    it('merges two files created on both sides from nothing', () => {
        const result = merged('', 'a: 1\n', 'b: 2\n');

        expect(result).toEqual({ text: 'a: 1\nb: 2\n', conflicts: [] });
    });

    it('takes a key one side removed and leaves the rest of the file alone', () => {
        const result = merged('a: 1\nb: 2 # keep\n', 'a: 1\nb: 2 # keep\nc: 3\n', 'b: 2 # keep\n');

        expect(result).toEqual({ text: 'b: 2 # keep\nc: 3\n', conflicts: [] });
    });

    it('gives back the text of ours as it was when the merge changes nothing in it', () => {
        const result = merged('a: 0\n', 'a:   1 # mine\n', 'a: 1\n');

        expect(result).toEqual({ text: 'a:   1 # mine\n', conflicts: [] });
    });
});

describe('merging a file that is not YAML', () => {
    it.each([
        ['base', 'a: [', 'a: 1\n', 'a: 2\n'],
        ['ours', 'a: 1\n', 'a: [', 'a: 2\n'],
        ['theirs', 'a: 1\n', 'a: 2\n', 'a: ['],
    ])('asks about the whole file when %s cannot be read', (_side, base, ours, theirs) => {
        const result = merged(base, ours, theirs);

        expect(result.text).toBe(ours);
        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0]).toMatchObject({ id: '', shape: 'file' });
    });

    /** Ten levels of ten aliases: a few lines that would unfold into ten billion values. */
    it('asks about the whole file when one side unfolds past what aliases may', () => {
        const levels = Array.from({ length: 9 }, (_value, n) => {
            const below = n === 0 ? 'a' : `b${String(n - 1)}`;

            return `b${String(n)}: &b${String(n)} [${Array(10).fill(`*${below}`).join(', ')}]`;
        });
        const bomb = ['a: &a [x, x, x, x, x, x, x, x, x, x]', ...levels].join('\n');
        const result = merged('a: 1\n', 'a: 2\n', bomb);

        expect(result.text).toBe('a: 2\n');
        expect(result.conflicts[0]).toMatchObject({ id: '', shape: 'file' });
    });
});
