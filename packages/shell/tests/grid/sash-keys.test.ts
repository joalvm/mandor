import { describe, expect, it, vi } from 'vitest';

import type { Sash } from '../../src/grid/grid-sashes.js';
import { sashKeysAttached } from '../../src/grid/sash-keys.js';

const SASH: Sash = { axis: 'row', index: 0, path: [], sizes: [60, 40] };

function root(count: number): HTMLElement {
    const element = document.createElement('div');
    const view = document.createElement('div');

    view.className = 'dv-grid-view';
    element.append(view);

    for (let index = 0; index < count; index += 1) {
        const sash = document.createElement('div');

        sash.className = 'dv-sash';
        view.append(sash);
    }

    return element;
}

function firstSeparator(element: HTMLElement): HTMLElement {
    const node = element.querySelector<HTMLElement>('.dv-sash');

    if (node === null) {
        throw new Error('the separator is drawn');
    }

    return node;
}

function press(node: HTMLElement, key: string, shiftKey = false): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, shiftKey });

    node.dispatchEvent(event);

    return event;
}

describe('giving the separators of the grid a keyboard', () => {
    it('names each one as a separator that can take the focus, with where it stands', () => {
        const element = root(1);

        sashKeysAttached(element, [SASH], vi.fn(), 'Resize group');

        const node = firstSeparator(element);

        expect(node.getAttribute('role')).toBe('separator');
        expect(node.getAttribute('aria-label')).toBe('Resize group');
        expect(node.getAttribute('aria-orientation')).toBe('vertical');
        expect(node.getAttribute('aria-valuenow')).toBe('60');
        expect(node.getAttribute('aria-valuemin')).toBe('5');
        expect(node.getAttribute('aria-valuemax')).toBe('95');
        expect(node.tabIndex).toBe(0);
    });

    it('moves the separator two shares with an arrow and ten with shift held', () => {
        const element = root(1);
        const onResize = vi.fn();

        sashKeysAttached(element, [SASH], onResize, 'Resize group');

        const node = firstSeparator(element);

        expect(press(node, 'ArrowRight').defaultPrevented).toBe(true);
        press(node, 'ArrowLeft');
        press(node, 'ArrowRight', true);

        expect(onResize.mock.calls).toEqual([
            [[], 0, 2],
            [[], 0, -2],
            [[], 0, 10],
        ]);
    });

    it('ignores a key that does not move it along its axis', () => {
        const element = root(1);
        const onResize = vi.fn();

        sashKeysAttached(element, [SASH], onResize, 'Resize group');

        expect(press(firstSeparator(element), 'ArrowDown').defaultPrevented).toBe(false);
        expect(onResize).not.toHaveBeenCalled();
    });

    it('lets go of the keyboard when taken back off', () => {
        const element = root(1);
        const onResize = vi.fn();
        const undo = sashKeysAttached(element, [SASH], onResize, 'Resize group');

        undo();
        press(firstSeparator(element), 'ArrowRight');

        expect(onResize).not.toHaveBeenCalled();
    });

    it('skips a separator the view did not draw', () => {
        const element = root(1);
        const second: Sash = { axis: 'column', index: 1, path: [0], sizes: [50, 50] };
        const undo = sashKeysAttached(element, [SASH, second], vi.fn(), 'Resize group');

        expect(element.querySelectorAll('[role="separator"]')).toHaveLength(1);
        expect(() => {
            undo();
        }).not.toThrow();
    });

    it('does nothing without a view to look in', () => {
        expect(() => {
            sashKeysAttached(null, [SASH], vi.fn(), 'Resize group')();
        }).not.toThrow();
    });
});
