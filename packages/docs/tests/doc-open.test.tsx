import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DocView } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';

const CONNECTION = 'mandor://local-apis/events/connection/ws-echo';

function renderDoc(uri: string): ReturnType<typeof vi.fn> {
    const open = vi.fn();

    render(<DocView onOpenResource={open} value={`[el recurso](${uri})\n`} />, {
        wrapper: AppProviders,
    });

    return open;
}

function link(): HTMLElement {
    return screen.getByRole('link', { name: 'el recurso' });
}

/**
 * The one link a doc carries that the app follows itself. What it may do is open: the doc says
 * where to look, and sending, connecting and deleting stay a click of the reader elsewhere.
 */
describe('a link to a resource of the workbench', () => {
    /** Reading a doc is half the reason the panel splits, so the resource lands in the other half. */
    it('hands the resource to the app instead of navigating to it', () => {
        const open = renderDoc(CONNECTION);

        fireEvent.click(link());

        expect(open).toHaveBeenCalledWith(CONNECTION, true);
    });

    it('opens it where the reader already is when the link is taken with a modifier', () => {
        const open = renderDoc(CONNECTION);

        fireEvent.click(link(), { altKey: true });

        expect(open).toHaveBeenCalledWith(CONNECTION, false);
    });

    /** A resource of the workbench has nothing to open a browser for, and no window to be given. */
    it('never sends a resource of the workbench out of the app', () => {
        renderDoc(CONNECTION);

        expect(link()).not.toHaveAttribute('target');
    });

    it('leaves an external link to the browser of the machine', () => {
        const open = renderDoc('https://ejemplo.test/guia');

        fireEvent.click(link());

        expect(open).not.toHaveBeenCalled();
        expect(link()).toHaveAttribute('target', '_blank');
    });
});
