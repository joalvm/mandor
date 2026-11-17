import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MessageSend } from '../../../../src/renderer/features/messages/components/strip/MessageSend.js';
import type { OutboundTarget } from '../../../../src/renderer/outbound/outbound-port.js';

import { AppProviders } from '../../support/app-providers.js';

function target(id: string, name: string, live: boolean): OutboundTarget {
    return { environmentId: 'local', id, live, name };
}

function draw(
    targets: OutboundTarget[],
    onSend: (target: OutboundTarget) => void = () => undefined,
): void {
    render(<MessageSend onSend={onSend} targets={() => targets} />, { wrapper: AppProviders });
}

describe('where a message goes', () => {
    /** One socket up is not a choice: asking which one would be a question with one answer. */
    it('goes through the only live connection without asking', () => {
        const onSend = vi.fn();
        const targets = [target('alpha', 'Gateway', true), target('beta', 'Billing', false)];

        draw(targets, onSend);
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));

        expect(onSend).toHaveBeenCalledWith(targets[0]);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('asks where to send when more than one connection is live, and offers only the live ones', async () => {
        const onSend = vi.fn();
        const beta = target('beta', 'Billing', true);

        draw([target('alpha', 'Gateway', true), beta, target('gamma', 'Gamma', false)], onSend);
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));

        const choices = screen.getByRole('dialog', { name: 'Send through' });

        expect(choices).toBeVisible();
        expect(onSend).not.toHaveBeenCalled();
        expect(within(choices).getByRole('button', { name: 'Gateway' })).toBeVisible();
        expect(within(choices).queryByRole('button', { name: 'Gamma' })).toBeNull();

        fireEvent.click(within(choices).getByRole('button', { name: 'Billing' }));

        expect(onSend).toHaveBeenCalledWith(beta);
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    /** Nothing is live, so the choice is which connection to open: the send follows it. */
    it('offers every connection of the workspace when none is live', () => {
        const onSend = vi.fn();
        const targets = [target('alpha', 'Gateway', false), target('beta', 'Billing', false)];

        draw(targets, onSend);
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));

        expect(screen.getByRole('button', { name: 'Gateway' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Billing' })).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Billing' }));

        expect(onSend).toHaveBeenCalledWith(targets[1]);
    });

    it('says there is nowhere to send while the workspace holds no connection', () => {
        draw([], vi.fn());
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));

        expect(screen.getByRole('dialog', { name: 'Send through' })).toHaveTextContent(
            'No connections in this workspace',
        );
    });
});
