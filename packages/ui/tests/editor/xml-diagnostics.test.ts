import { describe, expect, it } from 'vitest';

import { xmlDiagnostics } from '../../src/editor/xml-diagnostics.js';

function markedText(text: string): string[] {
    return xmlDiagnostics(text).map((mark) => text.slice(mark.from, mark.to));
}

describe('the marks of an xml text', () => {
    it('reads a well formed document as clean', () => {
        expect(xmlDiagnostics('<?xml version="1.0"?>\n<a><b x="1"/>&amp;</a>')).toEqual([]);
    });

    it('marks the closing tag that answers the wrong opening, on its own line', () => {
        const text = '<a>\n  <b></c>\n</a>';
        const [mark] = xmlDiagnostics(text);

        expect(markedText(text)).toEqual(['</c>']);
        expect(mark?.severity).toBe('error');
        expect(mark?.message).toContain('close tag');
    });

    it('marks the tag that never closes', () => {
        expect(markedText('<order>')).toEqual(['<order>']);
    });

    /** The parser only finds out when the text runs out, and by then it is past everything. */
    it('marks the innermost tag left open, not the text that ends the document', () => {
        expect(markedText('<a>\n  <b>text')).toEqual(['<b>']);
    });

    it('marks the attribute, not the tag around it', () => {
        expect(markedText('<a x=1></a>')).toEqual(['x=1']);
        expect(markedText('<a x=12/>')).toEqual(['x=12']);
    });

    it('marks the entity the document never declared', () => {
        expect(markedText('<a>&nbsp;</a>')).toEqual(['&nbsp;']);
    });

    /** A document has one root: a second one is where it stops being a document. */
    it('marks the second root of a document', () => {
        expect(markedText('<a></a> <b></b>')).toEqual(['<b>']);
    });

    it('marks a tag cut off before its name ends', () => {
        expect(markedText('<a')).toEqual(['<a']);
    });

    it('marks nothing while the text is still empty', () => {
        expect(xmlDiagnostics('')).toEqual([]);
        expect(xmlDiagnostics(' \n')).toEqual([]);
    });
});
