import { FORMAT_BYTES } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { bodyDiff, bodyNoteOf } from '../../../../src/renderer/features/history/lib/body-diff.js';
import { httpResponseWith, textBody } from '../../support/http-response.js';

const JSON_TYPE: [string, string][] = [['content-type', 'application/json']];
const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);

function textual(text: string, headers: [string, string][] = []) {
    return httpResponseWith({ body: textBody(text), headers });
}

describe('comparing the bodies of two responses', () => {
    it('says nothing is there to compare when neither has a body', () => {
        expect(bodyDiff(httpResponseWith(), httpResponseWith())).toEqual({ kind: 'empty' });
    });

    it('hands the text of both over whole, for the editor to find the lines', () => {
        const diff = bodyDiff(textual('one\ntwo\nthree'), textual('one\n2\nthree'));

        expect(diff).toEqual({
            after: 'one\n2\nthree',
            before: 'one\ntwo\nthree',
            kind: 'text',
            language: 'plaintext',
        });
    });

    it('lays JSON out before comparing, so only what moved shows', () => {
        const diff = bodyDiff(
            textual('{"a":1,"b":2}', JSON_TYPE),
            textual('{ "a": 1,   "b": 3 }', JSON_TYPE),
        );

        expect(diff).toEqual({
            after: '{\n    "a": 1,\n    "b": 3\n}',
            before: '{\n    "a": 1,\n    "b": 2\n}',
            kind: 'text',
            language: 'jsonc',
        });
    });

    it('compares JSON that does not parse as the text it came as', () => {
        const diff = bodyDiff(textual('{"a":', JSON_TYPE), textual('{"a":1', JSON_TYPE));

        expect(diff).toMatchObject({ after: '{"a":1', before: '{"a":', kind: 'text' });
    });

    it('sets a body against no body as all added or all removed', () => {
        const added = bodyDiff(httpResponseWith(), textual('x'));
        const removed = bodyDiff(textual('x'), httpResponseWith());

        expect(added).toMatchObject({ after: 'x', before: '', kind: 'text' });
        expect(removed).toMatchObject({ after: '', before: 'x', kind: 'text' });
    });

    it('compares a stored body by its reference and says only equal or different', () => {
        const stored = (ref: string) =>
            httpResponseWith({
                body: { bytes: 70000, contentType: 'text/plain', kind: 'stored', ref },
            });

        expect(bodyDiff(stored(SHA_A), stored(SHA_A))).toEqual({ kind: 'opaque', same: true });
        expect(bodyDiff(stored(SHA_A), stored(SHA_B))).toEqual({ kind: 'opaque', same: false });
    });

    it('compares a binary body by its bytes and says only equal or different', () => {
        const binary = (data: string) =>
            httpResponseWith({ body: { data, encoding: 'base64', kind: 'inline' } });

        expect(bodyDiff(binary('AAEC'), binary('AAEC'))).toEqual({ kind: 'opaque', same: true });
        expect(bodyDiff(binary('AAEC'), binary('AAED'))).toEqual({ kind: 'opaque', same: false });
    });

    it('never calls a stored body equal to one that stayed in memory', () => {
        const stored = httpResponseWith({
            body: { bytes: 3, contentType: 'text/plain', kind: 'stored', ref: SHA_A },
        });

        expect(bodyDiff(stored, textual('abc'))).toEqual({ kind: 'opaque', same: false });
    });

    it('does not lay out a text too large to read line by line', () => {
        const huge = 'x'.repeat(FORMAT_BYTES + 1);

        expect(bodyDiff(textual(huge), textual(huge))).toEqual({ kind: 'opaque', same: true });
        expect(bodyDiff(textual(huge), textual('small'))).toEqual({ kind: 'opaque', same: false });
    });

    it('says of a body it does not show that there is none, or whether the two match', () => {
        expect(bodyNoteOf({ kind: 'empty' })).toBe('bodyEmpty');
        expect(bodyNoteOf({ kind: 'opaque', same: true })).toBe('bodySame');
        expect(bodyNoteOf({ kind: 'opaque', same: false })).toBe('bodyDifferent');
    });
});
