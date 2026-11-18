import { byPart } from '@mandor/ui/testing';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActivityDetail } from '../../../src/renderer/activity/components/dock/ActivityDetail.js';
import { AppProviders } from '../support/app-providers.js';
import { faultEntryOf, messageEntryOf } from '../support/activity-entries.js';

describe('what the dock opens for each entry', () => {
    it('opens a frame on its payload, in the shape it arrived in', () => {
        render(
            <AppProviders>
                <ActivityDetail entry={messageEntryOf({ data: '{"ok":true}' })} />
            </AppProviders>,
        );

        expect(byPart('activity-detail')).toHaveAttribute('data-format', 'json');
        expect(byPart('frame-payload-view')).toBeInTheDocument();
    });

    it('opens a fault on its message and nothing else', () => {
        render(
            <AppProviders>
                <ActivityDetail entry={faultEntryOf('fs-read')} />
            </AppProviders>,
        );

        expect(byPart('activity-detail').textContent).toBe(
            'Mandor could not read the requested file.',
        );
    });
});
