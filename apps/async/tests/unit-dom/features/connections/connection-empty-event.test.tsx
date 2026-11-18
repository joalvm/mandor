import { envStore } from '@mandor/env';
import { ROOT_GROUP_ID } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';
import { byPart } from '@mandor/ui/testing';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { activityStore } from '../../../../src/renderer/activity/activity-store.js';
import { composerEventsStore } from '../../../../src/renderer/events/composer-events-store.js';
import { ConnectionPanel } from '../../../../src/renderer/features/connections/components/panel/ConnectionPanel.js';
import { connectionsStore } from '../../../../src/renderer/features/connections/connections-store.js';

import { AppProviders } from '../../support/app-providers.js';
import { fakeConnection } from './support/fake-connections.js';

const RESOURCE = 'mandor://demo/payments/connection/alpha';
const EVENT = {
    eventName: 'Saludo',
    eventResource: 'mandor://demo/payments/item/message/saludo',
    payload: '{}',
    payloadType: 'json' as const,
    schema: '',
};

function show(): void {
    render(<ConnectionPanel connectionId="alpha" resource={RESOURCE} />, { wrapper: AppProviders });
}

beforeEach(() => {
    activityStore.getState().reset();
    composerEventsStore.getState().reset();
    connectionsStore.getState().reset();
    envStore.getState().reset();
    shellStore.getState().reset();
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'payments' });
    shellStore.getState().openTab(ROOT_GROUP_ID, {
        id: 'alpha',
        kind: 'connection',
        resource: RESOURCE,
    });
    connectionsStore.getState().upsertConnection(fakeConnection('alpha', 'Gateway'));
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    vi.restoreAllMocks();
    shellStore.getState().reset();
});

describe('a connection with no event open', () => {
    /** A composer over nothing reads as a view that failed to load. One sentence reads as a way in. */
    it('sends the reader to the collection instead of drawing the composer', () => {
        show();

        expect(screen.getByText('Select an event from the collections')).toBeVisible();
        expect(screen.queryByRole('group', { name: 'Message composer' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Send' })).toBeNull();
    });

    /** The activity is of the connection: what it moved goes on whether an event is open or not. */
    it('keeps the activity of the connection beside the empty half', () => {
        show();

        expect(byPart('activity-panel')).toBeVisible();
        expect(byPart('activity-panel').contains(byPart('no-event-open'))).toBe(false);
    });

    it('keeps the url of the connection reachable with no event open', () => {
        show();

        expect(screen.getByRole('textbox', { name: 'Connection URL' })).toBeVisible();
    });
});

describe('a connection with an event open', () => {
    beforeEach(() => {
        composerEventsStore.getState().select('alpha', EVENT);
        show();
    });

    /** The trail heads the half of the event; the activity beside it is not the event's. */
    it('names the trail of the event over its half, apart from the activity', () => {
        const crumbs = byPart('connection-crumbs');

        expect(crumbs.textContent).toContain('Saludo');
        expect(byPart('connection-event').contains(crumbs)).toBe(true);
        expect(byPart('connection-strip').contains(crumbs)).toBe(false);
        expect(byPart('activity-panel').contains(crumbs)).toBe(false);
    });

    it('closes the event from the band and answers with the way back to the collection', () => {
        fireEvent.click(screen.getByRole('button', { name: 'Close the event' }));

        expect(composerEventsStore.getState().byConnection['alpha']).toBeUndefined();
        expect(screen.getByText('Select an event from the collections')).toBeVisible();
        expect(screen.queryByRole('group', { name: 'Message composer' })).toBeNull();
        expect(byPart('activity-panel')).toBeVisible();
    });
});

describe('the Schema tab of the event being composed', () => {
    it('marks the tab with a dot while the payload breaks a rule of the schema', () => {
        composerEventsStore.getState().select('alpha', {
            ...EVENT,
            payload: '{"id": 1}',
            schema: '{"properties": {"id": {"type": "string"}}}',
        });
        show();

        const tab = screen.getByRole('tab', { name: 'Schema' });

        expect(tab).toHaveAttribute('data-broken');
        expect(tab.querySelector('[data-part="tabs-broken"]')).not.toBeNull();
    });
});
