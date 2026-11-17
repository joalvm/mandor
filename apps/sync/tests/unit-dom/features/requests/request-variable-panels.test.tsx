import { itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { createEnvironment, parseCollectionItem, parseRequestItem } from '@mandor/schema';
import { bridge, shellStore } from '@mandor/shell';
import { Tabs } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestVariablePanels } from '../../../../src/renderer/features/requests/components/panel/RequestVariablePanels.js';
import { AppProviders } from '../../support/app-providers.js';
import { restOn, settled, UNDECLARED_BODY } from '../../support/undeclared-variables.js';

const RESOURCE = itemResource('Local', 'local', 'crear-pedido');
const IN_FORCE = createEnvironment({ id: 'local', name: 'Local' });
const REQUEST = parseRequestItem(parseCollectionItem(UNDECLARED_BODY));

const PLACES = [
    { name: 'inQuery', place: 'the query', section: 'params' },
    { name: 'inPath', place: 'the path', section: 'path' },
    { name: 'inHeader', place: 'the headers', section: 'headers' },
    { name: 'inAuth', place: 'the auth', section: 'auth' },
];

describe('the panels whose fields speak variables', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        shellStore.getState().reset();
        shellStore.setState({ activeWorkspaceId: 'local' });
        vi.spyOn(bridge.collections, 'chain').mockResolvedValue(success([]));
    });

    afterEach(() => {
        cleanup();
        shellStore.getState().reset();
    });

    it.each(PLACES)(
        'hand over the declaration a name of $place offers, for its owner to write',
        async ({ name, section }) => {
            const onVariablesChange = vi.fn();

            render(
                <Tabs onValueChange={() => undefined} value={section}>
                    <RequestVariablePanels
                        environment={IN_FORCE}
                        onChange={vi.fn()}
                        onFollow={vi.fn()}
                        onVariablesChange={onVariablesChange}
                        request={REQUEST}
                        resource={RESOURCE}
                    />
                </Tabs>,
                { wrapper: AppProviders },
            );

            await settled();
            await restOn(name);
            fireEvent.click(await screen.findByRole('button', { name: 'Create it in Local' }));

            expect(onVariablesChange).toHaveBeenCalledWith([
                { enabled: true, name, secret: false, value: '' },
            ]);
        },
    );
});
