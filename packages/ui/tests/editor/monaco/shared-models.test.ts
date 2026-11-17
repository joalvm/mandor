import { describe, expect, it } from 'vitest';

import { releaseModel, retainModel } from '../../../src/editor/monaco/shared-models.js';
import '../../../src/editor/monaco/monaco-setup.js';

describe('documents shared by key', () => {
    /** Two views of one text are one document: what is typed in one is read in the other. */
    it('gives every holder of a key the same document, with the text written so far', () => {
        const first = retainModel({ key: 'same', language: 'jsonc', value: '{}' });
        const second = retainModel({ key: 'same', language: 'jsonc', value: '[]' });

        expect(second).toBe(first);
        expect(second.getValue()).toBe('{}');

        releaseModel('same');
        releaseModel('same');
    });

    it('reads the document in the language of its latest holder', () => {
        retainModel({ key: 'language', language: 'jsonc', value: '<a/>' });

        const model = retainModel({ key: 'language', language: 'xml', value: '<a/>' });

        expect(model.getLanguageId()).toBe('xml');

        releaseModel('language');
        releaseModel('language');
    });

    it('lets the document go with its last holder, and a new holder starts over', () => {
        const model = retainModel({ key: 'last', language: 'jsonc', value: '1' });

        retainModel({ key: 'last', language: 'jsonc', value: '1' });
        releaseModel('last');

        expect(model.isDisposed()).toBe(false);

        releaseModel('last');

        expect(model.isDisposed()).toBe(true);
        expect(retainModel({ key: 'last', language: 'jsonc', value: '2' }).getValue()).toBe('2');

        releaseModel('last');
    });

    /** A payload read on Windows and sent from Linux is the same payload, byte for byte. */
    it('breaks lines with a line feed, whatever the text came with', () => {
        const model = retainModel({ key: 'eol', language: 'jsonc', value: '{\r\n}' });

        model.pushEditOperations(
            [],
            [{ range: model.getFullModelRange(), text: '[\n]' }],
            () => null,
        );

        expect(model.getValue()).toBe('[\n]');
        expect(model.getEOL()).toBe('\n');

        releaseModel('eol');
    });

    it('takes no notice of a key it never held', () => {
        expect(() => {
            releaseModel('never held');
        }).not.toThrow();
    });
});
