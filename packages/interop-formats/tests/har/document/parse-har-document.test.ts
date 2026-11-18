import { describe, expect, it } from 'vitest';

import { HarParseError } from '../../../src/har/document/har-parse-error.js';
import { parseHarDocument } from '../../../src/har/document/parse-har-document.js';
import { fixtureText } from '../support/fixture.js';

function problemsOf(text: string): string[] {
    try {
        parseHarDocument(text);
    } catch (error) {
        return (error as HarParseError).problems;
    }

    return [];
}

describe('parseHarDocument', () => {
    it('reads a recording into its entries', () => {
        expect(parseHarDocument(fixtureText('chrome.har')).log.entries).toHaveLength(8);
    });

    it('says the file is not JSON', () => {
        expect(problemsOf('{ not json')[0]).toMatch(/^The file is not JSON: /);
    });

    it('says what is wrong, each problem with its place', () => {
        expect(problemsOf('{"log":{"entries":[{"request":{"method":"GET"}}]}}')).toEqual([
            'log.entries.0.request.url: Invalid input: expected string, received undefined',
        ]);
    });

    it('names the root when the whole file is the wrong shape', () => {
        expect(problemsOf('[]')[0]).toMatch(/^\(root\): /);
    });

    it('refuses a recording with nothing in it', () => {
        expect(problemsOf('{"log":{"entries":[]}}')).toEqual(['The HAR has no entries']);
    });

    it('throws the error the host recognizes by its problems', () => {
        expect(() => parseHarDocument('[]')).toThrow(HarParseError);
    });
});
