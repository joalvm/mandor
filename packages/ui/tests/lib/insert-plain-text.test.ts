import { afterEach, describe, expect, it } from 'vitest';

import { insertPlainText } from '../../src/lib/insert-plain-text.js';

afterEach(() => {
    document.body.replaceChildren();
    window.getSelection()?.removeAllRanges();
});

function field(text: string): HTMLElement {
    const element = document.createElement('div');

    element.contentEditable = 'true';
    element.textContent = text;
    document.body.append(element);

    return element;
}

function select(element: HTMLElement, from: number, to: number): void {
    const range = document.createRange();
    const text = element.firstChild;

    if (text === null) {
        throw new Error('the field has text');
    }

    range.setStart(text, from);
    range.setEnd(text, to);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
}

describe('pasting plain text into an editable element', () => {
    it('replaces what is selected and leaves the caret after the text', () => {
        const element = field('hello world');

        select(element, 6, 11);
        insertPlainText(element, 'there');

        expect(element.textContent).toBe('hello there');

        const range = window.getSelection()?.getRangeAt(0);

        expect(range?.collapsed).toBe(true);
        expect(range?.startContainer).toBe(element);
        expect(element.childNodes[(range?.startOffset ?? 0) - 1]?.textContent).toBe('there');
    });

    it('inserts at the caret when nothing is selected', () => {
        const element = field('ab');

        select(element, 1, 1);
        insertPlainText(element, 'X');

        expect(element.textContent).toBe('aXb');
    });

    it('adds the text at the end when the selection is somewhere else', () => {
        const element = field('one');
        const other = field('two');

        select(other, 0, 3);
        insertPlainText(element, '!');

        expect(element.textContent).toBe('one!');
        expect(other.textContent).toBe('two');
    });

    it('adds the text at the end when there is no selection at all', () => {
        const element = field('one');

        window.getSelection()?.removeAllRanges();
        insertPlainText(element, '!');

        expect(element.textContent).toBe('one!');
    });

    it('never turns what was pasted into markup', () => {
        const element = field('');

        insertPlainText(element, '<b>bold</b>');

        expect(element.textContent).toBe('<b>bold</b>');
        expect(element.querySelector('b')).toBeNull();
    });
});
