import { afterEach, describe, expect, it, vi } from 'vitest';

import { hasEditToRestore, holdText, restoreHeldText } from '../../src/lib/held-text.js';

function line(text: string): HTMLElement {
    const element = document.createElement('span');

    element.textContent = text;
    element.tabIndex = 0;
    document.body.append(element);
    element.focus();

    return element;
}

afterEach(() => {
    document.body.replaceChildren();
});

describe('the text a line held', () => {
    it('comes back after an edit, and its owner hears it the way it hears typing', () => {
        const held = line('antes');
        const onInput = vi.fn();

        holdText(held);
        held.textContent = 'después';
        held.addEventListener('input', onInput);

        expect(hasEditToRestore(held)).toBe(true);
        expect(restoreHeldText(held)).toBe(true);
        expect(held.textContent).toBe('antes');
        expect(onInput).toHaveBeenCalledOnce();
        expect(hasEditToRestore(held)).toBe(false);
    });

    it('stays the first one when it is held again', () => {
        const held = line('antes');

        holdText(held);
        held.textContent = 'en medio';
        holdText(held);
        restoreHeldText(held);

        expect(held.textContent).toBe('antes');
    });

    it('has nothing to give back without an edit', () => {
        const held = line('antes');

        holdText(held);

        expect(restoreHeldText(held)).toBe(false);
        expect(restoreHeldText(line('sin retener'))).toBe(false);
        expect(hasEditToRestore(null)).toBe(false);
    });

    it('goes when the line loses the focus: what was written stays written', () => {
        const held = line('antes');

        holdText(held);
        held.textContent = 'después';
        held.blur();

        expect(hasEditToRestore(held)).toBe(false);
        expect(restoreHeldText(held)).toBe(false);
    });
});
