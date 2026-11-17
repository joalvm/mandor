import type { SkippedScript } from '@mandor/schema';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ReviewSkippedScripts } from '../../../src/components/scripts/ReviewSkippedScripts.js';
import { AppProviders } from '../../support/app-providers.js';

const SKIPPED: SkippedScript = {
    name: 'saludo',
    level: 'connection',
    event: 'onConnect',
    bytes: 12,
    source: 'socket.send("hi");',
};

afterEach(() => {
    cleanup();
});

describe('the way from a mark of scripts left out to reading them', () => {
    it('opens the dialog of the scripts left out only when asked', () => {
        render(
            <AppProviders>
                <ReviewSkippedScripts scripts={[SKIPPED]} workspaceId="events" />
            </AppProviders>,
        );

        expect(screen.queryByRole('dialog')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Review' }));

        expect(screen.getByRole('dialog', { name: '1 script left out' })).toBeVisible();
        expect(screen.getByRole('option', { name: 'saludo' })).toBeVisible();
    });
});
