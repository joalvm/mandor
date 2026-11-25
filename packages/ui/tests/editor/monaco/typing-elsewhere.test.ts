import { afterEach, describe, expect, it } from 'vitest';

import { typingElsewhere } from '../../../src/editor/monaco/typing-elsewhere.js';

afterEach(() => {
    document.body.replaceChildren();
});

function mounted(html: string): HTMLElement {
    const host = document.createElement('div');

    host.innerHTML = html;
    document.body.append(host);

    return host;
}

describe('typing-elsewhere: a field outside the editor someone writes in', () => {
    it('is a field outside the editor that holds the focus', () => {
        const editor = mounted('<div tabindex="0"></div>');
        const name = mounted('<input aria-label="name" />');

        name.querySelector('input')?.focus();

        expect(typingElsewhere(editor)).toBe(true);
    });

    it('is not the editor itself, nor a button that holds the focus', () => {
        const editor = mounted('<textarea></textarea>');
        const button = mounted('<button type="button">go</button>');

        editor.querySelector('textarea')?.focus();
        expect(typingElsewhere(editor)).toBe(false);

        button.querySelector('button')?.focus();
        expect(typingElsewhere(editor)).toBe(false);
    });
});
