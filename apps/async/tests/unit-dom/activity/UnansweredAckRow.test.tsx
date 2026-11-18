import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UnansweredAckRow } from '../../../src/renderer/activity/components/row/UnansweredAckRow.js';
import { AppProviders } from '../support/app-providers.js';

describe('the close of an unanswered wait', () => {
    it('names the event and the fault in one row like any other', () => {
        render(
            <AppProviders>
                <UnansweredAckRow
                    entry={{
                        at: Date.UTC(2026, 8, 15, 12, 0, 0),
                        bytes: 12,
                        detail: {
                            at: Date.UTC(2026, 8, 15, 12, 0, 0),
                            direction: 'out',
                            data: '',
                            environmentId: null,
                            event: 'chat:message',
                            timedOut: true,
                        },
                        id: 'e1',
                        kind: 'connection-message',
                    }}
                />
            </AppProviders>,
        );

        expect(screen.getByText('chat:message — Unanswered ack')).toBeInTheDocument();
    });

    it('names nothing but the fault when the wait carried no event', () => {
        render(
            <AppProviders>
                <UnansweredAckRow
                    entry={{
                        at: Date.UTC(2026, 8, 15, 12, 0, 0),
                        bytes: 12,
                        detail: {
                            at: 0,
                            direction: 'out',
                            data: '',
                            environmentId: null,
                            timedOut: true,
                        },
                        id: 'e2',
                        kind: 'connection-message',
                    }}
                />
            </AppProviders>,
        );

        expect(screen.getByText('Unanswered ack')).toBeInTheDocument();
    });
});
