import { SendIcon } from '@mandor/icons';
import { success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    collectionStore,
    CollectionSidebar,
    ItemExampleMark,
    ItemKind,
    useItem,
    WorkspaceCollection,
} from '../src/index.js';

import { AppProviders } from './support/app-providers.js';
import { EXAMPLE_CREADO, exampleSpies, WITH_EXAMPLES } from './support/login-with-examples.js';

/** The mark of the test kind: the example it is drawn for, and the code the tree read. */
function CodeMark() {
    const { resource, saved } = useItem();

    return <i data-resource={resource}>{`code ${saved ?? ''}`}</i>;
}

const spies = exampleSpies();

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success(WITH_EXAMPLES));
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    shellStore.getState().reset();
});

describe('the mark an example wears (ItemExampleMark)', () => {
    it('stands in the row of the example, with the code the tree read off the file', async () => {
        render(
            <ItemKind component={SendIcon} examples={spies} kind="request" newLabel="x">
                <ItemExampleMark>
                    <CodeMark />
                </ItemExampleMark>
            </ItemKind>,
            { wrapper: AppProviders },
        );
        render(
            <>
                <WorkspaceCollection />
                <CollectionSidebar />
            </>,
            { wrapper: AppProviders },
        );
        fireEvent.keyDown(await screen.findByRole('treeitem', { name: 'Login' }), {
            key: 'ArrowRight',
        });

        const mark = screen.getByText('code 201');

        expect(mark).toHaveAttribute('data-resource', EXAMPLE_CREADO);
        expect(mark.closest('[data-part="collection-example-mark"]')).not.toBeNull();
    });

    it('writes the code as plain text when the kind declared no mark for its examples', async () => {
        render(<ItemKind component={SendIcon} examples={spies} kind="request" newLabel="x" />, {
            wrapper: AppProviders,
        });
        render(
            <>
                <WorkspaceCollection />
                <CollectionSidebar />
            </>,
            { wrapper: AppProviders },
        );
        fireEvent.keyDown(await screen.findByRole('treeitem', { name: 'Login' }), {
            key: 'ArrowRight',
        });

        expect(screen.getByText('500')).toHaveClass('text-text-tertiary');
    });
});
