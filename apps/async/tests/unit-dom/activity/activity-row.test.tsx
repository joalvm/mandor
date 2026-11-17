import { allByPart, byPart } from '@mandor/ui/testing';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActivityRow } from '../../../src/renderer/activity/components/row/ActivityRow.js';
import { AppProviders } from '../support/app-providers.js';
import { faultEntryOf, messageEntryOf, statusEntryOf } from '../support/activity-entries.js';

describe('the line of the timeline each entry draws', () => {
    it('draws a frame as a frame, with the direction it crossed', () => {
        render(
            <AppProviders>
                <ActivityRow entry={messageEntryOf({ direction: 'out' })} />
            </AppProviders>,
        );

        expect(byPart('activity-row')).toHaveAttribute('data-direction', 'out');
        expect(allByPart('activity-fault-row')).toHaveLength(0);
    });

    it('draws a fault as a fault, translated from its code', () => {
        render(
            <AppProviders>
                <ActivityRow entry={faultEntryOf('ws-open-failed')} />
            </AppProviders>,
        );

        expect(byPart('activity-fault-row')).toHaveTextContent(
            'The connection could not be opened.',
        );
        expect(allByPart('activity-row')).toHaveLength(0);
    });

    it('draws the socket coming up as a line of its own', () => {
        render(
            <AppProviders>
                <ActivityRow entry={statusEntryOf('connected')} />
            </AppProviders>,
        );

        expect(byPart('activity-status-row')).toHaveTextContent('Connected');
        expect(allByPart('activity-row')).toHaveLength(0);
    });
});
