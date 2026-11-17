import { success } from '@mandor/ipc';
import type { CollectionNode } from '@mandor/schema';
import { bridge, selectTabs, shellStore, tabKind, TabProvider } from '@mandor/shell';
import { translatorIn } from '@mandor/shell/testing/tab-kind';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FolderTab } from '../src/components/folder/FolderTab.js';
import { FOLDER_TAB_KIND } from '../src/folder-section-declarations.js';
import { blankItemTabs } from '../src/lib/blank-item-tabs.js';
import { folderTitle } from '../src/lib/folder-title.js';
import { moveItemTabs } from '../src/lib/move-item-tabs.js';
import { folderTabId, openFolderTab } from '../src/lib/open-folder-tab.js';
import {
    collectionStore,
    folderPartsOf,
    folderResource,
    FolderSection,
    FolderSectionBody,
    FolderTabKind,
} from '../src/index.js';

import { AppProviders } from './support/app-providers.js';

const PEDIDOS: CollectionNode = {
    kind: 'collection',
    name: 'Pedidos',
    path: 'pedidos',
    children: [{ kind: 'folder', name: 'Altas', path: 'pedidos/altas', children: [] }],
};
const TREE: CollectionNode[] = [PEDIDOS];
const ALTAS = folderResource('Local APIs', 'events', 'pedidos/altas');

let unregister: () => void = () => undefined;

beforeEach(() => {
    collectionStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    collectionStore.setState({ nodes: TREE });
    vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success(TREE));
    unregister = render(<FolderTabKind />).unmount;
});

afterEach(() => {
    cleanup();
    unregister();
    shellStore.getState().reset();
    collectionStore.getState().reset();
});

function Sections() {
    return (
        <>
            <FolderSection id="docs" label="Docs">
                <FolderSectionBody>
                    <p>the docs</p>
                </FolderSectionBody>
            </FolderSection>
            <FolderSection id="variables" label="Variables">
                <FolderSectionBody>
                    <p>the variables</p>
                </FolderSectionBody>
            </FolderSection>
        </>
    );
}

function showTab(resource = ALTAS, tabId = folderTabId('events', 'pedidos/altas')): void {
    render(
        <>
            <Sections />
            <TabProvider value={{ resource, tabId }}>
                <FolderTab />
            </TabProvider>
        </>,
        { wrapper: AppProviders },
    );
}

describe('the resource of the tab of a folder', () => {
    it('names the group of the tree and reads back as it', () => {
        expect(folderPartsOf(ALTAS)).toEqual({ path: 'pedidos/altas', workspaceId: 'events' });
        expect(folderPartsOf('mandor://local-apis/events/item/pedidos/x')).toBeNull();
    });
});

describe('the kind of tab of a folder', () => {
    it('is titled by the name of its node, and by nothing once the node is gone', () => {
        expect(tabKind(FOLDER_TAB_KIND)?.title(ALTAS, translatorIn())).toBe('Altas');
        expect(folderTitle(folderResource('Local APIs', 'events', 'pedidos/nadie'))).toBe('');
        expect(folderTitle('mandor://local-apis/events/item/pedidos/x')).toBe('');
        expect(tabKind(FOLDER_TAB_KIND)?.section).toBe('collections');
    });

    it('opens one tab per group, and brings it forward with the section asked for', () => {
        openFolderTab('events', 'pedidos/altas');
        openFolderTab('events', 'pedidos/altas', 'variables');

        expect(selectTabs(shellStore.getState()).map((tab) => tab.resource)).toEqual([ALTAS]);
        expect(
            collectionStore.getState().folderSections[folderTabId('events', 'pedidos/altas')],
        ).toBe('variables');
    });
});

describe('the tab of a folder', () => {
    it('shows the sections the app declared, the first in sight, and changes on a click', () => {
        showTab();

        expect(screen.getByText('the docs')).toBeVisible();

        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Variables' }));

        expect(screen.getByText('the variables')).toBeVisible();
    });

    it('stays open and says so once its group is gone', () => {
        showTab(folderResource('Local APIs', 'events', 'pedidos/nadie'));

        expect(screen.getByText('This folder is gone')).toBeInTheDocument();
    });

    it('says it has no sections when the app declared none', () => {
        render(
            <TabProvider value={{ resource: ALTAS, tabId: 'folder-x' }}>
                <FolderTab />
            </TabProvider>,
            { wrapper: AppProviders },
        );

        expect(screen.getByText('This folder has no sections')).toBeInTheDocument();
    });

    it('refuses a body written outside its section', () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);

        expect(() =>
            render(
                <FolderSectionBody>
                    <p>lost</p>
                </FolderSectionBody>,
            ),
        ).toThrow('A folder section body is declared inside a FolderSection.');
    });
});

describe('the tab of a folder that moves or goes', () => {
    it('follows its group, and the groups under it, to where they went', () => {
        openFolderTab('events', 'pedidos');
        openFolderTab('events', 'pedidos/altas');
        act(() => {
            moveItemTabs('events', PEDIDOS, 'compras');
        });

        expect(selectTabs(shellStore.getState()).map((tab) => tab.resource)).toEqual([
            folderResource('Local APIs', 'events', 'compras'),
            folderResource('Local APIs', 'events', 'compras/altas'),
        ]);
    });

    it('stays open when its group is deleted', () => {
        openFolderTab('events', 'pedidos/altas');
        act(() => {
            blankItemTabs('events', PEDIDOS);
        });

        expect(selectTabs(shellStore.getState())).toHaveLength(1);
    });
});
