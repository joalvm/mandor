import { ItemProvider, itemResource } from '@mandor/collections';
import { envStore } from '@mandor/env';
import { success } from '@mandor/ipc';
import { createEnvironment } from '@mandor/schema';
import { bridge, shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestPanel } from '../../../../src/renderer/features/requests/components/panel/RequestPanel.js';
import { requestsStore } from '../../../../src/renderer/features/requests/index.js';
import { AppProviders } from '../../support/app-providers.js';
import { restOn, settled, UNDECLARED_BODY } from '../../support/undeclared-variables.js';

const RESOURCE = itemResource('Local', 'local', 'crear-pedido');

/** Where each name stands: the tab that shows it, or none when the bar above the tabs does. */
const PLACES = [
    { name: 'inUrl', place: 'the address bar', tab: null },
    { name: 'inQuery', place: 'the query', tab: 'Params' },
    { name: 'inPath', place: 'the path', tab: 'Path' },
    { name: 'inHeader', place: 'the headers', tab: 'Headers' },
    { name: 'inAuth', place: 'the auth', tab: 'Auth' },
];

let stored = createEnvironment({ id: 'local', name: 'Local' });

/** How the name is painted right now: what the field says about it before anyone hovers. */
function toneOf(name: string): string | undefined {
    return document.querySelector<HTMLElement>(`[data-variable="${name}"]`)?.dataset['tone'];
}

/** The workspace holds one environment, in force, and writes what it is told to. */
function holdEnvironment(): void {
    stored = createEnvironment({ id: 'local', name: 'Local' });
    envStore.setState({
        activeEnvironmentIds: { local: stored.id },
        environments: [stored],
    });
    vi.spyOn(bridge.environment, 'update').mockImplementation(({ changes }) => {
        stored = { ...stored, variables: [...(changes.variables ?? [])] };

        return Promise.resolve(success(stored));
    });
    vi.spyOn(bridge.environment, 'list').mockImplementation(() =>
        Promise.resolve(success([stored])),
    );
}

describe('the variables a request names and nobody declares', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        shellStore.getState().reset();
        shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
        shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
        envStore.getState().reset();
        requestsStore.getState().reset();
        holdEnvironment();
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(success(UNDECLARED_BODY));
        vi.spyOn(bridge.collections, 'chain').mockResolvedValue(success([]));
    });

    afterEach(() => {
        cleanup();
        envStore.getState().reset();
        requestsStore.getState().reset();
        shellStore.getState().reset();
    });

    it.each(PLACES)(
        'are created in the environment in force from $place, and the popover turns into their editor',
        async ({ name, tab }) => {
            render(
                <ItemProvider value={{ resource: RESOURCE, saved: undefined }}>
                    <RequestPanel />
                </ItemProvider>,
                { wrapper: AppProviders },
            );

            await screen.findByRole('textbox', { name: 'URL' });

            if (tab !== null) {
                fireEvent.mouseDown(await screen.findByRole('tab', { name: tab }));
            }

            await settled();
            await restOn(name);
            fireEvent.click(await screen.findByRole('button', { name: 'Create it in Local' }));

            await waitFor(() => {
                expect(bridge.environment.update).toHaveBeenCalledWith({
                    changes: { variables: [{ enabled: true, name, secret: false, value: '' }] },
                    environmentId: stored.id,
                    workspaceId: 'local',
                });
            });

            const editor = await screen.findByRole('textbox', { name: 'Variable value' });

            expect(editor).toHaveFocus();
            await waitFor(() => {
                expect(toneOf(name)).toBe('empty');
            });
        },
    );

    it.each(PLACES)(
        'turn from missing to resolved as the value is typed in $place, with no Enter',
        async ({ name, tab }) => {
            render(
                <ItemProvider value={{ resource: RESOURCE, saved: undefined }}>
                    <RequestPanel />
                </ItemProvider>,
                { wrapper: AppProviders },
            );

            await screen.findByRole('textbox', { name: 'URL' });

            if (tab !== null) {
                fireEvent.mouseDown(await screen.findByRole('tab', { name: tab }));
            }

            await settled();
            expect(toneOf(name)).toBe('missing');
            await restOn(name);
            fireEvent.click(await screen.findByRole('button', { name: 'Create it in Local' }));

            const editor = await screen.findByRole('textbox', { name: 'Variable value' });

            fireEvent.input(editor, { target: { textContent: 'typed' } });

            await waitFor(() => {
                expect(toneOf(name)).toBe('resolved');
            });
            expect(stored.variables).toEqual([
                { enabled: true, name, secret: false, value: 'typed' },
            ]);
            expect(screen.getByRole('dialog', { name: `{{${name}}}` })).toBeInTheDocument();
            expect(screen.getByRole('textbox', { name: 'Variable value' })).toHaveFocus();
        },
    );
});
