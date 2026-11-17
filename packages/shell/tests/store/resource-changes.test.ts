import { createFakeBridge } from '@mandor/ipc/testing';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import type { Tab } from '../../src/index.js';
import { createShellStore, type ShellStoreApi } from '../../src/shell-store.js';

const NOTES = 'mandor://demo/payments/doc/notas.md';
const RENAMED = 'mandor://demo/payments/doc/notas-de-la-api.md';
const GUIDES = 'mandor://demo/payments/doc/guias';
const INSIDE = 'mandor://demo/payments/doc/guias/inicio.md';
const MANUAL = 'mandor://demo/payments/doc/manual';
const MOVED = 'mandor://demo/payments/doc/manual/inicio.md';
const SIBLING = 'mandor://demo/payments/doc/guias-viejas/inicio.md';
const ITEM = 'mandor://demo/payments/item/pedidos/pedido-creado';
const IN_FOLDER = 'mandor://demo/payments/item/pedidos';
const IN_ARCHIVE = 'mandor://demo/payments/item/archivo';
const ARCHIVED = 'mandor://demo/payments/item/archivo/pedido-creado';

function tabFor(id: string, resource: string): Tab {
    return { id, kind: 'doc', resource };
}

function store(): ShellStoreApi {
    return createShellStore(createFakeBridge());
}

function tabsOf(api: ShellStoreApi): Tab[] {
    return leavesOf(api.getState().grid).flatMap((leaf) => leaf.tabs);
}

describe('a resource that moves or disappears on disk', () => {
    /** Two views of one document. Renaming the file is not a reason to close either of them. */
    it('leaves both tabs of one document open under the name it has now', () => {
        const api = store();
        const right = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        api.getState().openTab(ROOT_GROUP_ID, tabFor('left-view', NOTES));
        api.getState().openTab(right, tabFor('right-view', NOTES));
        api.getState().moveResource(NOTES, RENAMED);

        expect(tabsOf(api)).toEqual([tabFor('left-view', RENAMED), tabFor('right-view', RENAMED)]);
        expect(api.getState().resources).toEqual({
            [RENAMED]: { missing: false, tabs: ['left-view', 'right-view'] },
        });
    });

    it('takes the tabs of what was inside a folder that moved', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, tabFor('inside', INSIDE));
        api.getState().openTab(ROOT_GROUP_ID, tabFor('sibling', SIBLING));
        api.getState().moveResource(GUIDES, MANUAL);

        expect(tabsOf(api)).toEqual([tabFor('inside', MOVED), tabFor('sibling', SIBLING)]);
    });

    /** An item is named by its path too, so renaming its folder moves the tab and its title. */
    it('follows an item of the collection into the folder its own folder became', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, { id: 'item', kind: 'item', resource: ITEM });
        api.getState().moveResource(IN_FOLDER, IN_ARCHIVE);

        expect(tabsOf(api)).toEqual([{ id: 'item', kind: 'item', resource: ARCHIVED }]);
        expect(api.getState().resources).toEqual({
            [ARCHIVED]: { missing: false, tabs: ['item'] },
        });
    });

    it('says nothing about a resource no tab of the window is looking at', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, tabFor('notes', NOTES));
        api.getState().moveResource(GUIDES, MANUAL);
        api.getState().removeResource(GUIDES);

        expect(api.getState().resources).toEqual({ [NOTES]: { missing: false, tabs: ['notes'] } });
    });

    /** A file deleted under the app takes nothing with it: what is on screen stays on screen. */
    it('marks the resource as absent instead of closing the tab that holds it', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, tabFor('notes', NOTES));
        api.getState().removeResource(NOTES);

        expect(tabsOf(api)).toEqual([tabFor('notes', NOTES)]);
        expect(api.getState().resources).toEqual({ [NOTES]: { missing: true, tabs: ['notes'] } });
    });

    it('keeps the mark while the tabs of the window move around it', () => {
        const api = store();
        const right = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        api.getState().openTab(ROOT_GROUP_ID, tabFor('notes', NOTES));
        api.getState().removeResource(NOTES);
        api.getState().moveTab('notes', right);

        expect(api.getState().resources).toEqual({ [NOTES]: { missing: true, tabs: ['notes'] } });
    });

    it('lets go of the mark when the file comes back under another name', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, tabFor('notes', NOTES));
        api.getState().removeResource(NOTES);
        api.getState().moveResource(NOTES, RENAMED);

        expect(api.getState().resources).toEqual({
            [RENAMED]: { missing: false, tabs: ['notes'] },
        });
    });
});
