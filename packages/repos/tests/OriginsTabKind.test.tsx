import { ROOT_GROUP_ID } from '@mandor/ipc';
import {
    selectActiveTabId,
    selectGroupOfTab,
    selectTabs,
    shellStore,
    tabKind,
    tabKindOf,
    windowSurface,
} from '@mandor/shell';
import { translatorIn } from '@mandor/shell/testing/tab-kind';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { OriginsTabKind } from '../src/index.js';
import { openOriginsTab, ORIGINS_TAB_KIND } from '../src/lib/open-origins-tab.js';

const OTHER = { id: 'other', kind: 'doc', resource: 'mandor://local/events/doc/one.md' };

let unregister: () => void = () => undefined;

beforeEach(() => {
    vi.restoreAllMocks();
    shellStore.getState().reset();
    unregister = render(<OriginsTabKind onSwitch={() => undefined} />).unmount;
});

afterEach(() => {
    unregister();
    shellStore.getState().reset();
});

describe('the origins tab kind', () => {
    it('opens the tab on the group in focus and reads it', () => {
        openOriginsTab();

        expect(selectTabs(shellStore.getState()).map((tab) => tab.kind)).toEqual([
            ORIGINS_TAB_KIND,
        ]);
        expect(selectActiveTabId(shellStore.getState())).toBe(ORIGINS_TAB_KIND);
    });

    it('opens the tab once, however many times it is asked for', () => {
        openOriginsTab();
        openOriginsTab();

        expect(selectTabs(shellStore.getState())).toHaveLength(1);
    });

    /**
     * Half of the window is asking, and the list is open in the other half. The answer is to go
     * there: a tab is open once, so refusing to move the focus answers the reader with nothing.
     */
    it('goes to the tab when it is open in the other group of the window', () => {
        openOriginsTab();
        shellStore.getState().openTabAside(OTHER);
        openOriginsTab();

        expect(shellStore.getState().activeGroupId).toBe(ROOT_GROUP_ID);
        expect(selectActiveTabId(shellStore.getState())).toBe(ORIGINS_TAB_KIND);
        expect(selectGroupOfTab(shellStore.getState(), ORIGINS_TAB_KIND)).toBe(ROOT_GROUP_ID);
    });

    it('titles the tab with the heading of the panel it shows', () => {
        expect(tabKindOf(ORIGINS_TAB_KIND).title('mandor://_app/origins', translatorIn())).toBe(
            'Origins',
        );
    });

    /** It is a tab like any other, and a tab the reader cannot close is a tab that traps them. */
    it('leaves the tab closable', () => {
        expect(tabKindOf(ORIGINS_TAB_KIND).closable).toBe(true);
    });

    it('answers as a surface, so a command sends the reader here without knowing it is a tab', () => {
        windowSurface(ORIGINS_TAB_KIND)?.open(shellStore.getState());

        expect(selectTabs(shellStore.getState())).toHaveLength(1);
    });

    it('leaves the window when the app gives the kind back', () => {
        unregister();

        expect(tabKind(ORIGINS_TAB_KIND)).toBeUndefined();
        expect(windowSurface(ORIGINS_TAB_KIND)).toBeUndefined();
    });
});
