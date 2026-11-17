import { afterEach, describe, expect, it } from 'vitest';

import { caretOffsetIn, placeCaretAt, rangeOfOffsets } from '../../src/lib/caret-offset.js';

afterEach(() => {
    document.body.replaceChildren();
});

/** jsdom keeps a selection only inside the document tree, so the field is attached first. */
function field(text: string): [HTMLDivElement, Text] {
    const node = document.createElement('div');
    const content = document.createTextNode(text);

    node.append(content);
    document.body.append(node);

    return [node, content];
}

describe('the caret as a character offset', () => {
    it('reads how deep the caret sits in the node', () => {
        const [node, content] = field('wss://{{host}}');
        const range = document.createRange();

        range.setStart(content, 7);
        range.collapse(true);
        document.getSelection()?.removeAllRanges();
        document.getSelection()?.addRange(range);

        expect(caretOffsetIn(node)).toBe(7);
    });

    it('reads null when the caret lives outside the node', () => {
        const [node] = field('wss://{{host}}');
        const elsewhere = document.createElement('p');

        elsewhere.textContent = 'other';
        document.body.append(elsewhere);
        document.getSelection()?.selectAllChildren(elsewhere);

        expect(caretOffsetIn(node)).toBeNull();
    });

    it('places the caret at the offset asked', () => {
        const [node, content] = field('wss://{{host}}');

        placeCaretAt(node, 10);

        const range = document.getSelection()?.getRangeAt(0);

        expect(range?.startContainer).toBe(content);
        expect(range?.startOffset).toBe(10);
        expect(range?.collapsed).toBe(true);
    });

    it('places the caret inside the text node that holds the offset', () => {
        const node = document.createElement('div');
        const head = document.createTextNode('wss://');
        const token = document.createElement('span');
        const tail = document.createTextNode('{{host}}');

        token.append(tail);
        node.append(head, token);
        document.body.append(node);

        placeCaretAt(node, 10);

        const range = document.getSelection()?.getRangeAt(0);

        expect(range?.startContainer).toBe(tail);
        expect(range?.startOffset).toBe(4);
    });

    it('places the caret at the end when the offset is past the text', () => {
        const [node] = field('host');

        placeCaretAt(node, 100);

        expect(caretOffsetIn(node)).toBe(4);
    });

    it('builds a range over two character offsets', () => {
        const [node] = field('wss://{{host}}/socket');

        const range = rangeOfOffsets(node, 6, 12);

        expect(range.toString()).toBe('{{host');
    });

    it('builds a range that ends where the text ends when the last offset is past it', () => {
        const [node] = field('{{host}}');

        const range = rangeOfOffsets(node, 2, 100);

        expect(range.toString()).toBe('host}}');
    });
});
