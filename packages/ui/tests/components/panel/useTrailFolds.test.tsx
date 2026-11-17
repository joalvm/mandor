import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Breadcrumbs } from '../../../src/components/panel/Breadcrumbs.js';

const TRAIL = ['Session', 'Forget Password', 'Reset', 'Change Password'];

/** jsdom lays nothing out: each stretch is ten per letter, cut by one when the room is short. */
const NATURAL = TRAIL.join('').length * 10;

let room = 0;
let resized: () => void = () => undefined;

function isStretch(element: Element): boolean {
    return element.getAttribute('data-part') === 'breadcrumbs-stretch';
}

beforeEach(() => {
    vi.stubGlobal(
        'ResizeObserver',
        class {
            constructor(callback: () => void) {
                resized = callback;
            }

            observe(): void {
                // The test says when the room changes.
            }

            disconnect(): void {
                // Nothing to let go of.
            }
        },
    );
    vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function (this: Element) {
        return isStretch(this) ? this.textContent.length * 10 : 0;
    });
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
        if (this.tagName === 'OL') {
            return room;
        }

        const natural = this.textContent.length * 10;

        return isStretch(this) && room < NATURAL ? natural - 1 : natural;
    });
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

function shown(): string[] {
    return screen.getAllByRole('listitem').map((item) => item.textContent);
}

describe('useTrailFolds, the trail that folds its middle when it no longer fits', () => {
    it('draws the whole trail while it fits', () => {
        room = 1000;
        render(<Breadcrumbs label="Ubicación" parts={TRAIL} />);

        expect(shown()).toEqual(TRAIL);
    });

    it('keeps the first and the last once a stretch is cut, and names the middle on hover', () => {
        room = 100;
        render(<Breadcrumbs label="Ubicación" parts={TRAIL} />);

        expect(shown()).toEqual(['Session', '…', 'Change Password']);
        expect(screen.getByText('…')).toHaveAttribute('title', 'Forget Password › Reset');
        expect(screen.getByText('Change Password')).toHaveAttribute('aria-current', 'page');
    });

    it('unfolds once the room grows back to what the whole trail needed', () => {
        room = 100;
        render(<Breadcrumbs label="Ubicación" parts={TRAIL} />);

        room = 1000;
        act(() => {
            resized();
        });

        expect(shown()).toEqual(TRAIL);
    });
});
