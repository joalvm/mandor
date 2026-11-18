import { MessagesProvider } from '@mandor/i18n';
import { byPart } from '@mandor/ui/testing';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { OriginSwitching } from '../../../src/components/overlay/OriginSwitching.js';
import { shellStore } from '../../../src/shell-store.js';

beforeEach(() => {
    shellStore.getState().reset();
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();
});

function draw(): void {
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <OriginSwitching />
        </MessagesProvider>,
    );
}

describe('the window while the origin under it is replaced', () => {
    it('draws nothing while the work stays where it was', () => {
        draw();

        expect(screen.queryByText('Changing where the work lives…')).toBeNull();
        expect(document.querySelector('[data-part="origin-switching"]')).toBeNull();
    });

    it('covers the window and says what is happening for as long as the switch lasts', () => {
        draw();

        act(() => {
            shellStore.getState().setSwitchingOrigin(true);
        });

        expect(byPart('origin-switching').textContent).toBe('Changing where the work lives…');

        act(() => {
            shellStore.getState().setSwitchingOrigin(false);
        });

        expect(document.querySelector('[data-part="origin-switching"]')).toBeNull();
    });
});
