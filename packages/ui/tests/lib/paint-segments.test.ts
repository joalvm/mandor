import { describe, expect, it } from 'vitest';

import { paintSegments, type InputSegment } from '../../src/lib/paint-segments.js';

function painted(segments: readonly InputSegment[]): HTMLDivElement {
    const node = document.createElement('div');

    paintSegments(node, segments);

    return node;
}

describe('painting the segments of a field', () => {
    it('appends one text node per plain segment', () => {
        const node = painted([{ text: 'wss://' }, { text: '/socket' }]);

        expect(node.childNodes.length).toBe(2);
        expect(node.textContent).toBe('wss:///socket');
        expect(node.querySelectorAll('span')).toHaveLength(0);
    });

    it('paints a toned segment as a token span marked with its tone', () => {
        const node = painted([{ text: '{{host}}', tone: 'resolved' }]);
        const token = node.querySelector('span');

        expect(token?.dataset['part']).toBe('variable-token');
        expect(token?.dataset['tone']).toBe('resolved');
        expect(token?.textContent).toBe('{{host}}');
    });

    it('names a token after the variable it carries', () => {
        const node = painted([{ text: '{{host}}', tone: 'missing', name: 'host' }]);

        expect(node.querySelector('span')?.dataset['variable']).toBe('host');
    });

    it('leaves a token without a name unnamed', () => {
        const node = painted([{ text: 'wss://', tone: 'open' }]);

        expect(node.querySelector('span')?.dataset['variable']).toBeUndefined();
    });

    it('paints the title a segment carries onto its token', () => {
        const node = painted([{ text: '{{host}}', tone: 'resolved', title: 'Local' }]);

        expect(node.querySelector('span')?.title).toBe('Local');
    });

    it('keeps the text of every segment in the order the field holds it', () => {
        const node = painted([
            { text: 'wss://' },
            { text: '{{host}}', tone: 'resolved', name: 'host' },
            { text: '/socket' },
        ]);

        expect(node.textContent).toBe('wss://{{host}}/socket');
    });

    it('replaces what the node held, so a repaint never doubles the text', () => {
        const node = painted([{ text: 'first' }]);

        paintSegments(node, [{ text: 'second' }]);

        expect(node.textContent).toBe('second');
    });

    /** A field with no text stays childless: the placeholder paints on `:empty`. */
    it('appends nothing for a segment that carries no text', () => {
        const node = painted([{ text: '' }]);

        expect(node.childNodes.length).toBe(0);
    });
});
