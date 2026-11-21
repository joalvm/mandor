import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { byPart } from '@mandor/ui/testing';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ActivityEntry } from '../../../src/renderer/activity/activity-entry.js';
import { DockBand } from '../../../src/renderer/activity/components/dock/DockBand.js';
import { DockCloseContext } from '../../../src/renderer/activity/dock-close.js';
import { formatActivityTime } from '../../../src/renderer/activity/lib/format-activity-time.js';

const AT = 1_700_000_000_123;

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

function frame(direction: 'in' | 'out'): ActivityEntry {
    return {
        at: AT,
        bytes: 56,
        detail: { at: AT, data: '{"seq":7}', direction, environmentId: null },
        id: `frame-${direction}`,
        kind: 'connection-message',
    };
}

const STATUS: ActivityEntry = {
    at: AT,
    bytes: 0,
    detail: { status: 'connected' },
    id: 'status-1',
    kind: 'connection-status',
};

describe('the band over the detail of an entry', () => {
    /** The band says of the entry what the row said: which way it crossed, its weight, its moment. */
    it('says which way a frame crossed, what it weighed and when', () => {
        render(<DockBand entry={frame('in')} />, { wrapper: Wrapper });

        const band = byPart('activity-dock-head');

        expect(band).toHaveClass('h-section');
        expect(screen.getByText('Recibido')).toHaveClass('font-semibold');
        expect(band).toHaveTextContent(`56 B·${formatActivityTime(AT)}`);
    });

    it('names a frame that left as sent', () => {
        render(<DockBand entry={frame('out')} />, { wrapper: Wrapper });

        expect(screen.getByText('Enviado')).toBeVisible();
    });

    it('names no direction for an entry that never crossed the wire', () => {
        render(<DockBand entry={STATUS} />, { wrapper: Wrapper });

        expect(screen.queryByText('Recibido')).toBeNull();
        expect(screen.queryByText('Enviado')).toBeNull();
        expect(byPart('activity-dock-head')).toHaveTextContent(formatActivityTime(AT));
    });

    it('carries what its detail puts in it before the way out', () => {
        const close = vi.fn();

        render(
            <DockCloseContext value={close}>
                <DockBand entry={frame('in')}>
                    <span>JSON</span>
                </DockBand>
            </DockCloseContext>,
            { wrapper: Wrapper },
        );

        const way = screen.getByRole('button', { name: 'Cerrar' });
        const put = screen.getByText('JSON');

        expect(byPart('activity-dock-head')).toContainElement(put);
        expect(put.compareDocumentPosition(way) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);

        fireEvent.click(way);

        expect(close).toHaveBeenCalledTimes(1);
    });

    /** A detail drawn outside a dock has nothing to close, and offers no way out of nothing. */
    it('offers no way out outside a dock', () => {
        render(<DockBand entry={frame('in')} />, { wrapper: Wrapper });

        expect(screen.queryByRole('button', { name: 'Cerrar' })).toBeNull();
    });
});
