import { afterEach, describe, expect, it } from 'vitest';

import { phaseOnClosing } from '../../../src/components/command-palette/phase-on-closing.js';

afterEach(() => {
    document.head.replaceChildren();
    document.body.replaceChildren();
});

function box(animation: string | undefined): HTMLElement {
    const node = document.createElement('div');

    node.dataset['part'] = 'palette-probe';
    document.body.append(node);

    if (animation !== undefined) {
        const sheet = document.createElement('style');

        sheet.textContent = `[data-part='palette-probe'] { animation-name: ${animation}; }`;
        document.head.append(sheet);
    }

    return node;
}

/** A closed palette waits for its fade only where the sheet gave it one. */
describe('what a palette turns into when it closes', () => {
    it('lingers while the sheet animates its box', () => {
        expect(phaseOnClosing(box('mandor-layer-in'))).toBe('closing');
    });

    it('goes at once where the sheet animates nothing', () => {
        expect(phaseOnClosing(box(undefined))).toBe('gone');
        expect(phaseOnClosing(box('none'))).toBe('gone');
    });

    it('goes at once when there is no box to fade', () => {
        expect(phaseOnClosing(null)).toBe('gone');
    });
});
