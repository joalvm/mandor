import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider, type SettingsEditing } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HandshakeTimeoutRow } from '../../../../src/renderer/features/connections/components/dialog/HandshakeTimeoutRow.js';
import type { ResolvedHandshake } from '../../../../src/renderer/features/connections/lib/connection-settings.js';

afterEach(() => {
    cleanup();
});

function editingOf(
    change: (part: Partial<ResolvedHandshake>) => void,
    inherits = false,
): SettingsEditing<ResolvedHandshake> {
    return {
        change,
        inheritanceOf: () =>
            inherits
                ? { caption: 'Default from', onFollow: () => undefined, place: 'Settings' }
                : undefined,
        values: { timeoutMs: 20_000 },
    };
}

function draw(editing: SettingsEditing<ResolvedHandshake>): void {
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <HandshakeTimeoutRow editing={editing} />
            </TooltipProvider>
        </MessagesProvider>,
    );
}

describe('HandshakeTimeoutRow', () => {
    it('shows the wait the connection dials with', () => {
        draw(editingOf(vi.fn()));

        expect(screen.getByRole('textbox', { name: 'Handshake timeout' })).toHaveTextContent(
            '20000',
        );
    });

    it('hands a typed wait over as the timeout of the handshake', () => {
        const change = vi.fn();

        draw(editingOf(change));

        const field = screen.getByRole('textbox', { name: 'Handshake timeout' });

        field.textContent = '4000';
        fireEvent.input(field);

        expect(change).toHaveBeenCalledWith({ timeoutMs: 4_000 });
    });

    it('says where its value comes from while it follows the defaults', () => {
        draw(editingOf(vi.fn(), true));

        expect(screen.getByText('Default from')).toBeVisible();
    });
});
