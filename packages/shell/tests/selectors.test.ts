import { createFakeBridge } from '@mandor/ipc/testing';
import { ROOT_GROUP_ID } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { selectFrontResource, selectOpenResources, selectTabShown } from '../src/selectors.js';
import { createShellStore, type ShellStoreApi } from '../src/shell-store.js';
import type { Tab } from '../src/tab/tab.js';

function tab(id: string): Tab {
    return { id, kind: 'connection', resource: `mandor://demo/events/connection/${id}` };
}

function store(): ShellStoreApi {
    return createShellStore(createFakeBridge());
}

describe('which tabs the window is showing', () => {
    it('shows the tab a group is on and hides the ones behind it', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, tab('one'));
        api.getState().openTab(ROOT_GROUP_ID, tab('two'));

        expect(selectTabShown(api.getState(), 'two')).toBe(true);
        expect(selectTabShown(api.getState(), 'one')).toBe(false);

        api.getState().setActiveTab(ROOT_GROUP_ID, 'one');

        expect(selectTabShown(api.getState(), 'one')).toBe(true);
        expect(selectTabShown(api.getState(), 'two')).toBe(false);
    });

    it('shows the tab of a group the focus is not in, since that group shows it as well', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, tab('one'));
        api.getState().openTabAside(tab('two'));
        api.getState().focusGroup(ROOT_GROUP_ID);

        expect(selectTabShown(api.getState(), 'one')).toBe(true);
        expect(selectTabShown(api.getState(), 'two')).toBe(true);
    });

    it('does not show a tab that is not open', () => {
        expect(selectTabShown(store().getState(), 'nothing')).toBe(false);
    });
});

describe('what the tab in front looks at', () => {
    it('reads the resource of the tab the focused group is on', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, tab('one'));
        api.getState().openTabAside(tab('two'));

        expect(selectFrontResource(api.getState())).toBe('mandor://demo/events/connection/two');

        api.getState().focusGroup(ROOT_GROUP_ID);

        expect(selectFrontResource(api.getState())).toBe('mandor://demo/events/connection/one');
    });

    it('reads nothing while no tab is open', () => {
        expect(selectFrontResource(store().getState())).toBeNull();
    });
});

describe('which resources the window has open', () => {
    it('lists the resource of every tab of every group once, the focus aside', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, tab('one'));
        api.getState().openTabAside(tab('two'));
        api.getState().openTab(ROOT_GROUP_ID, {
            ...tab('three'),
            resource: 'mandor://demo/events/connection/one',
        });

        expect(selectOpenResources(api.getState())).toEqual([
            'mandor://demo/events/connection/one',
            'mandor://demo/events/connection/two',
        ]);
    });

    it('answers the same list while the grid is the same one, and a new one when it changes', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, tab('one'));

        const before = selectOpenResources(api.getState());

        expect(selectOpenResources(api.getState())).toBe(before);

        api.getState().openTab(ROOT_GROUP_ID, tab('two'));

        expect(selectOpenResources(api.getState())).not.toBe(before);
    });
});
