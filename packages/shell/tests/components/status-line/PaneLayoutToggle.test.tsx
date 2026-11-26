import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PaneLayoutToggle } from '../../../src/components/status-line/PaneLayoutToggle.js';
import { paneLayoutStore } from '../../../src/index.js';

function draw() {
    return render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <PaneLayoutToggle />
            </TooltipProvider>
        </MessagesProvider>,
    );
}

afterEach(() => {
    cleanup();
    window.localStorage.clear();
    paneLayoutStore.setState(paneLayoutStore.getInitialState());
});

describe('the switch of the layout on the status line', () => {
    it('names the layout standing and the one a click gives, and turns it', () => {
        draw();

        fireEvent.click(
            screen.getByRole('button', { name: 'Diseño vertical · pasar a horizontal' }),
        );

        expect(paneLayoutStore.getState().layout).toBe('horizontal');

        fireEvent.click(
            screen.getByRole('button', { name: 'Diseño horizontal · pasar a vertical' }),
        );

        expect(paneLayoutStore.getState().layout).toBe('vertical');
    });

    /** Two layouts are two states of a picture, not a switch held down. */
    it('is never drawn pressed', () => {
        draw();

        expect(
            screen.getByRole('button', { name: 'Diseño vertical · pasar a horizontal' }),
        ).not.toHaveAttribute('aria-pressed');
    });
});
