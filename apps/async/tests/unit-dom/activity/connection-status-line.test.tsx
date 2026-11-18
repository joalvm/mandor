import { MessagesProvider } from '@mandor/i18n';
import { byPart } from '@mandor/ui/testing';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { ConnectionStatusDetail } from '../../../src/renderer/activity/components/dock/ConnectionStatusDetail.js';
import { ConnectionStatusRow } from '../../../src/renderer/activity/components/row/ConnectionStatusRow.js';
import { statusEntryOf } from '../support/activity-entries.js';

function Wrapper({ children }: { children: ReactNode }) {
    return <MessagesProvider preferences={{ language: 'es' }}>{children}</MessagesProvider>;
}

describe('the line of the socket coming up or going down', () => {
    it('says the socket came up, at the moment it did', () => {
        render(<ConnectionStatusRow entry={statusEntryOf('connected')} />, { wrapper: Wrapper });

        const row = byPart('activity-status-row');

        expect(row).toHaveAttribute('data-status', 'connected');
        expect(byPart('activity-status-message')).toHaveTextContent('Conectada');
        expect(row.querySelector('time')).toHaveAttribute(
            'dateTime',
            new Date(1_700_000_000_000).toISOString(),
        );
    });

    it('says the socket went down', () => {
        render(<ConnectionStatusRow entry={statusEntryOf('disconnected')} />, {
            wrapper: Wrapper,
        });

        expect(byPart('activity-status-message')).toHaveTextContent('Desconectada');
    });

    /** The moment is the band's to say; the dock says only what happened. */
    it('reads the same words whole in the dock', () => {
        render(<ConnectionStatusDetail entry={statusEntryOf('disconnected')} />, {
            wrapper: Wrapper,
        });

        expect(byPart('activity-detail')).toHaveAttribute('data-format', 'text');
        expect(byPart('activity-detail').textContent).toBe('Desconectada');
    });
});
