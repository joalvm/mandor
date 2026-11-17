import { MessagesProvider } from '@mandor/i18n';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { byPart } from '@mandor/ui/testing';

import { ConnectionFaultRow } from '../../../../../src/renderer/activity/components/row/ConnectionFaultRow.js';
import { formatActivityTime } from '../../../../../src/renderer/activity/lib/format-activity-time.js';
import { faultEntryOf } from '../../../support/activity-entries.js';

function Wrapper({ children }: { children: ReactNode }) {
    return <MessagesProvider preferences={{ language: 'es' }}>{children}</MessagesProvider>;
}

describe('the row of a network failure', () => {
    it('says the failure in words, from its code alone', () => {
        render(<ConnectionFaultRow entry={faultEntryOf('ws-open-failed')} />, { wrapper: Wrapper });

        expect(byPart('activity-fault-message')).toHaveTextContent('No se pudo abrir la conexión.');
    });

    it('marks the row with the error state of the connection', () => {
        render(<ConnectionFaultRow entry={faultEntryOf()} />, { wrapper: Wrapper });

        expect(screen.getByRole('img', { name: 'Error' })).toBeInTheDocument();
    });

    it('sits at the moment it happened', () => {
        const entry = faultEntryOf('ws-send-failed', 1_700_000_000_000);

        render(<ConnectionFaultRow entry={entry} />, { wrapper: Wrapper });

        const time = byPart('activity-fault-row').querySelector('time');

        expect(time).toHaveAttribute('dateTime', new Date(entry.at).toISOString());
        expect(time).toHaveTextContent(formatActivityTime(entry.at));
    });
});
