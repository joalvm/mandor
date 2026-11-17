import { afterEach, describe, expect, it } from 'vitest';

import { caretOffsetIn } from '@mandor/ui';

import { completeVariable } from '../src/lib/complete-variable.js';

afterEach(() => {
    document.body.replaceChildren();
});

function field(text: string): HTMLSpanElement {
    const node = document.createElement('span');

    node.append(document.createTextNode(text));
    document.body.append(node);

    return node;
}

describe('closing the variable being written', () => {
    it('closes the open braces with the name picked', () => {
        const node = field('wss://{{ho');

        completeVariable(node, 'host');

        expect(node.textContent).toBe('wss://{{host}}');
    });

    it('leaves the caret right after the closed token', () => {
        const node = field('wss://{{ho');

        completeVariable(node, 'host');

        expect(caretOffsetIn(node)).toBe(node.textContent.length);
    });

    it('does nothing when no opening waits', () => {
        const node = field('wss://plain');

        completeVariable(node, 'host');

        expect(node.textContent).toBe('wss://plain');
    });

    /** The opening that closed before stays as it is; only the tail is replaced. */
    it('replaces only the tail after the last opening', () => {
        const node = field('{{host}} and {{to');

        completeVariable(node, 'token');

        expect(node.textContent).toBe('{{host}} and {{token}}');
    });

    /** The field draws the close in advance: completing swaps the name, never doubles it. */
    it('replaces the name and keeps the close that was already drawn', () => {
        const node = field('{{de}}');

        completeVariable(node, 'deviceType', 4);

        expect(node.textContent).toBe('{{deviceType}}');
        expect(caretOffsetIn(node)).toBe(14);
    });
});
