import { allByPart } from '@mandor/ui/testing';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ActivityEntry } from '../../../src/renderer/activity/activity-entry.js';
import { ActivityLog } from '../../../src/renderer/activity/components/panel/ActivityLog.js';
import { AppProviders } from '../support/app-providers.js';
import { faultEntryOf, messageEntryOf } from '../support/activity-entries.js';

function draw(entries: ActivityEntry[]): void {
    render(
        <AppProviders>
            <ActivityLog entries={entries} label="Actividad" />
        </AppProviders>,
    );
}

describe('the activity log', () => {
    /** The list holds a timeline of anything: each entry is drawn by the row of its kind. */
    it('draws each entry with the row of its kind', () => {
        draw([messageEntryOf({ data: 'uno' }, '1'), faultEntryOf('ws-open-failed', 2)]);

        expect(allByPart('activity-row')).toHaveLength(1);
        expect(allByPart('activity-fault-row')).toHaveLength(1);
    });

    /** The newest is the one the user came to see: it lands on top, and the past reads downward. */
    it('draws the newest entry first, so what just arrived needs no scroll', () => {
        draw([
            messageEntryOf({ data: 'uno' }, '1'),
            messageEntryOf({ data: 'dos' }, '2'),
            messageEntryOf({ data: 'tres' }, '3'),
        ]);

        expect(allByPart('activity-preview').map((preview) => preview.textContent)).toEqual([
            'tres',
            'dos',
            'uno',
        ]);
    });

    it('draws an empty timeline without a row in it', () => {
        draw([]);

        expect(screen.getByRole('log', { name: 'Actividad' })).toBeInTheDocument();
        expect(allByPart('activity-row')).toHaveLength(0);
    });
});
