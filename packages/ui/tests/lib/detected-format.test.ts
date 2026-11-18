import { describe, expect, it } from 'vitest';

import { detectedFormat } from '../../src/lib/detected-format.js';

describe('reading the shape of a payload', () => {
    it('calls JSON what parses as JSON', () => {
        expect(detectedFormat('{ "id": 1 }')).toBe('json');
        expect(detectedFormat('  [1, 2, 3]  ')).toBe('json');
    });

    /** A number parses as JSON and is not a frame anybody wrote as JSON. */
    it('leaves a bare scalar as text', () => {
        expect(detectedFormat('42')).toBe('text');
        expect(detectedFormat('hola')).toBe('text');
    });

    it('calls XML what opens and closes with a tag', () => {
        expect(detectedFormat('<order id="1"></order>')).toBe('xml');
    });

    /** A page is markup too, but one that is read with the rules of HTML: void tags, no closing. */
    it('calls HTML a page that says it is one', () => {
        expect(detectedFormat('<!DOCTYPE html><html><body><br></body></html>')).toBe('html');
        expect(detectedFormat('<html lang="es"><p>hola</p></html>')).toBe('html');
    });

    /** A piece of a page has the void tags of a page: XML would read `<br>` as left open. */
    it('calls HTML the markup that opens with an element of HTML', () => {
        expect(detectedFormat('<div class="row"><br></div>')).toBe('html');
        expect(detectedFormat('<P>hola<BR>mundo</P>')).toBe('html');
    });

    /** A prolog or a namespace is XML saying what it is, whatever its first element is called. */
    it('keeps as XML the markup that declares itself XML', () => {
        expect(detectedFormat('<?xml version="1.0"?><table><row/></table>')).toBe('xml');
        expect(detectedFormat('<table xmlns="urn:rows"><row/></table>')).toBe('xml');
        expect(detectedFormat('<soap:Envelope xmlns:soap="urn:s"></soap:Envelope>')).toBe('xml');
    });

    /** A control byte no text frame carries. Tab, line feed and carriage return are not it. */
    it('calls binary what carries a control byte', () => {
        expect(detectedFormat('ok\u0000')).toBe('binary');
        expect(detectedFormat('one\ttwo\r\nthree')).toBe('text');
    });

    /** What the connection announced is a promise; the payload itself is the evidence. */
    it('reads the payload and not what it was labelled', () => {
        expect(detectedFormat('{ "broken": ')).toBe('text');
    });
});
