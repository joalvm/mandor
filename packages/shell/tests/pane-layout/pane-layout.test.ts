import { afterEach, describe, expect, it } from 'vitest';

import {
    PANE_DIRECTION,
    paneLayoutStore,
    readPaneLayout,
    togglePaneLayout,
} from '../../src/pane-layout/pane-layout.js';

afterEach(() => {
    window.localStorage.clear();
    paneLayoutStore.setState(paneLayoutStore.getInitialState());
});

describe('the layout of the halves of a tab', () => {
    it('stands vertical in a window that never turned it', () => {
        expect(readPaneLayout()).toBe('vertical');
        expect(paneLayoutStore.getState().layout).toBe('vertical');
    });

    it('turns to the other layout and back, keeping each for the next window', () => {
        togglePaneLayout();

        expect(paneLayoutStore.getState().layout).toBe('horizontal');
        expect(readPaneLayout()).toBe('horizontal');

        togglePaneLayout();

        expect(paneLayoutStore.getState().layout).toBe('vertical');
        expect(readPaneLayout()).toBe('vertical');
    });

    it('takes a kept layout it does not know for the vertical one', () => {
        window.localStorage.setItem('mandor.paneLayout', 'diagonal');

        expect(readPaneLayout()).toBe('vertical');
    });

    /** Vertical keeps the halves side by side only while both can be read; horizontal always stacks. */
    it('sets the halves side by side when they fit, or one over the other', () => {
        expect(PANE_DIRECTION).toEqual({ horizontal: 'column', vertical: 'fit' });
    });
});
