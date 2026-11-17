import { collectionStore } from '@mandor/collections';
import type { CollectionNode } from '@mandor/schema';
import { selectTabs, shellStore } from '@mandor/shell';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FolderAuthLine } from '../../../../../../src/renderer/features/requests/components/auth/FolderAuthLine.js';

import { openRowMenu } from '../../../../support/row-menu.js';

const NODE: CollectionNode = { kind: 'collection', name: 'Tienda', path: 'tienda', children: [] };

const ROW = {
    node: NODE,
    workspaceId: 'personal',
};

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'personal' });
});

afterEach(() => {
    cleanup();
    collectionStore.getState().reset();
    shellStore.getState().reset();
});

describe('the auth line of the menu of a folder', () => {
    it('is named for the authorization of the folder', () => {
        openRowMenu(ROW, <FolderAuthLine />);

        expect(screen.getByRole('menuitem', { name: 'Authorization…' })).toBeVisible();
    });

    it('opens the tab of the folder on its auth section', () => {
        openRowMenu(ROW, <FolderAuthLine />);

        fireEvent.click(screen.getByRole('menuitem', { name: 'Authorization…' }));

        const [opened] = selectTabs(shellStore.getState());

        expect(opened?.resource).toContain('tienda');
        expect(collectionStore.getState().folderSections[opened?.id ?? '']).toBe('auth');
    });

    it('opens nothing while the window has no workspace', () => {
        shellStore.setState({ activeWorkspaceId: null });
        openRowMenu(ROW, <FolderAuthLine />);

        fireEvent.click(screen.getByRole('menuitem', { name: 'Authorization…' }));

        expect(selectTabs(shellStore.getState())).toEqual([]);
    });
});
