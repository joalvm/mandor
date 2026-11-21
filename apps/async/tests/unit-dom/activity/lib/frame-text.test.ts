import { FORMAT_BYTES } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { frameText } from '../../../../src/renderer/activity/lib/frame-text.js';

/** «hola» as the bridge encodes the bytes of a frame that arrived as bytes. */
const HOLA_BYTES = { binary: true, data: 'aG9sYQ==' } as const;

describe('the text a frame reads as', () => {
    it('lays JSON out in the JSON view', () => {
        expect(frameText({ data: '{"id":7}' }, 'json')).toBe('{\n    "id": 7\n}');
    });

    /** Raw is the frame untouched: what the other end sent, spaces and all. */
    it('keeps the frame exactly as it came in the raw view', () => {
        expect(frameText({ data: '{"id":7}' }, 'raw')).toBe('{"id":7}');
    });

    it('leaves XML and HTML as they came, since re-indenting them shows what nobody sent', () => {
        expect(frameText({ data: '<a><b/></a>' }, 'xml')).toBe('<a><b/></a>');
        expect(frameText({ data: '<p>hola</p>' }, 'html')).toBe('<p>hola</p>');
    });

    it('keeps a text that is not JSON as it came in the JSON view', () => {
        expect(frameText({ data: 'hola' }, 'json')).toBe('hola');
    });

    /** Laying out a hundred megabytes froze the window: past the cut, JSON reads as it came. */
    it('leaves JSON past the cut as it came', () => {
        const data = `{"big":"${'x'.repeat(FORMAT_BYTES)}"}`;

        expect(frameText({ data }, 'json')).toBe(data);
    });

    /** What travelled is base64; read as text, the bytes that arrived are decoded, not their carrier. */
    it('reads the bytes of a frame that arrived as bytes as UTF-8 text', () => {
        expect(frameText(HOLA_BYTES, 'raw')).toBe('hola');
    });

    it('reads only the head of a binary frame past the cut', () => {
        const data = 'QUFB'.repeat(FORMAT_BYTES);

        expect(frameText({ binary: true, data }, 'raw')).toHaveLength(FORMAT_BYTES);
    });
});
