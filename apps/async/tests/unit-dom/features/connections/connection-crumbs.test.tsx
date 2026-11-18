import { byPart } from '@mandor/ui/testing';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConnectionCrumbs } from '../../../../src/renderer/features/connections/components/panel/ConnectionCrumbs.js';

import { AppProviders } from '../../support/app-providers.js';

const PARTS = ['Chat', 'Saludo'];

describe('the band naming the event a connection holds', () => {
    it('reads the trail outermost first, inside its own band', () => {
        render(<ConnectionCrumbs onClose={vi.fn()} parts={PARTS} transport="socketio" />, {
            wrapper: AppProviders,
        });

        expect(byPart('connection-crumbs').textContent).toContain('Chat');
        expect(byPart('connection-crumbs').textContent).toContain('Saludo');
    });

    /** The trail names the event, so letting the event go is an action of the trail. */
    it('lets the event go from the side opposite the trail', () => {
        const onClose = vi.fn();

        render(<ConnectionCrumbs onClose={onClose} parts={PARTS} transport="socketio" />, {
            wrapper: AppProviders,
        });
        fireEvent.click(screen.getByRole('button', { name: 'Close the event' }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('heads the trail with the logo of the transport the connection dials', () => {
        render(<ConnectionCrumbs onClose={vi.fn()} parts={PARTS} transport="socketio" />, {
            wrapper: AppProviders,
        });

        expect(byPart('breadcrumbs-lead')).toContainElement(byPart('transport-logo'));
    });
});
