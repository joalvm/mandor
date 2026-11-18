import { describe, expect, it } from 'vitest';

import { InsomniaParseError } from '../../../src/insomnia/document/insomnia-parse-error.js';
import {
    looksLikeInsomnia,
    looksLikeInsomniaFiles,
    sniffInsomnia,
} from '../../../src/insomnia/document/sniff-insomnia.js';
import { fixtureText } from '../support/fixture.js';

function problemOf(root: unknown): string {
    try {
        sniffInsomnia(root);
    } catch (error) {
        return error instanceof InsomniaParseError ? error.problems.join('|') : 'other error';
    }

    return 'no error';
}

describe('sniffInsomnia', () => {
    it('tells a v5 collection by its type', () => {
        expect(sniffInsomnia({ type: 'collection.insomnia.rest/5.0' })).toBe(5);
    });

    it('tells a v4 export by its format', () => {
        expect(sniffInsomnia({ _type: 'export', __export_format: 4 })).toBe(4);
    });

    it('refuses the other files of v5 and says to import the collection', () => {
        expect(problemOf({ type: 'spec.insomnia.rest/5.0' })).toBe(
            'The Insomnia file "spec.insomnia.rest/5.0" is not a collection: import the collection file of the project',
        );
        expect(problemOf({ type: 'environment.insomnia.rest/5.0' })).toContain('not a collection');
    });

    it('refuses an export format it does not read and says to export again', () => {
        expect(problemOf({ _type: 'export', __export_format: 3 })).toBe(
            'The Insomnia export format 3 is not supported: export it again from a current Insomnia',
        );
    });

    it.each([
        ['an array', []],
        ['text', 'x'],
        ['a record with no marks', { info: {} }],
        ['a type that is not an Insomnia one', { type: 'collection' }],
        ['an export with no number', { _type: 'export', __export_format: '4' }],
        ['a number with no export', { __export_format: 4 }],
    ])('refuses %s as not an Insomnia export', (_name, root) => {
        expect(problemOf(root)).toBe('This is not an Insomnia export (v4 or v5)');
    });
});

describe('looksLikeInsomnia', () => {
    it('knows both layouts, in JSON and in YAML', () => {
        expect(looksLikeInsomnia(fixtureText('collection-v4.json'))).toBe(true);
        expect(looksLikeInsomnia(fixtureText('collection-v5.yaml'))).toBe(true);
    });

    it('counts a layout the app does not read, because reading it says how to export again', () => {
        expect(looksLikeInsomnia('{"_type":"export","__export_format":3}')).toBe(true);
        expect(looksLikeInsomnia('type: spec.insomnia.rest/5.0\n')).toBe(true);
    });

    it('does not take other documents for Insomnia', () => {
        expect(looksLikeInsomnia('[1]')).toBe(false);
        expect(looksLikeInsomnia('{"type":"object"}')).toBe(false);
        expect(looksLikeInsomnia('{"_type":"export"}')).toBe(false);
        expect(looksLikeInsomnia('{"info":{"name":"x"}}')).toBe(false);
    });
});

describe('looksLikeInsomniaFiles', () => {
    const v4 = { path: 'a.json', text: fixtureText('collection-v4.json') };
    const v5 = { path: 'b.yaml', text: fixtureText('collection-v5.yaml') };

    it('takes any number of Insomnia files as one import', () => {
        expect(looksLikeInsomniaFiles([v4])).toBe(true);
        expect(looksLikeInsomniaFiles([v4, v5])).toBe(true);
    });

    it('wants every file to be Insomnia, and at least one', () => {
        expect(looksLikeInsomniaFiles([v4, { path: 'x.json', text: '[]' }])).toBe(false);
        expect(looksLikeInsomniaFiles([])).toBe(false);
    });
});
