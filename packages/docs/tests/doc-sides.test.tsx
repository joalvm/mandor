import { success } from '@mandor/ipc';
import { bridge, tabKindOf } from '@mandor/shell';
import { DrawnTabPart } from '@mandor/shell/testing/tab-kind';
import { settleEditorRuntime } from '@mandor/ui/testing/editors-in';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DocTabKind } from '../src/index.js';
import { docsStore } from '../src/docs-store.js';

import { AppProviders } from './support/app-providers.js';

const README = 'mandor://local-apis/events/doc/readme.md';
const TAB = 'doc-1';

let unregister = (): void => undefined;

function openTab() {
    return render(<DrawnTabPart kind="doc" resource={README} tabId={TAB} />, {
        wrapper: AppProviders,
    });
}

/** What the band offers says which side the tab is on: the way back is only on the editor. */
async function writing(): Promise<boolean> {
    await screen.findByRole('button', { name: /^(View|Edit)$/ });

    return screen.queryByRole('button', { name: 'View' }) !== null;
}

function onDisk(text: string): void {
    vi.spyOn(bridge.doc, 'read').mockResolvedValue(success(text));
}

beforeEach(() => {
    vi.restoreAllMocks();
    docsStore.getState().reset();
    unregister = render(<DocTabKind />).unmount;
});

afterEach(async () => {
    unregister();
    await settleEditorRuntime();
});

/**
 * Which side a doc opens on is not a preference: it is what the file has to say. Nothing to read
 * is a doc waiting to be written, and everything else is a page somebody wrote to be read.
 */
describe('the side a doc opens on', () => {
    it('opens the editor on a doc with nothing in it', async () => {
        onDisk('');
        openTab();

        expect(await writing()).toBe(true);
    });

    it('opens the page on a doc with something in it', async () => {
        onDisk('# Readme\n');
        openTab();

        expect(await screen.findByRole('heading', { level: 1, name: 'Readme' })).toBeVisible();
        expect(await writing()).toBe(false);
    });

    /** The tab must not turn into the page under the hands of whoever is typing into it. */
    it('stays on the editor while the first sentence is typed into an empty doc', async () => {
        onDisk('');
        openTab();

        expect(await writing()).toBe(true);

        act(() => {
            docsStore.getState().setText(README, '# Lo primero');
        });

        expect(await writing()).toBe(true);
    });

    /** The doc made a minute ago is a doc with text in it now (saved to disk), and opens the way that one does. */
    it('opens the page on a doc that was written into and closed', async () => {
        onDisk('');

        const { unmount } = openTab();

        expect(await writing()).toBe(true);

        act(() => {
            docsStore.getState().setText(README, '# Lo primero');
        });
        unmount();
        tabKindOf('doc').release?.(TAB, README);
        onDisk('# Lo primero');
        openTab();

        expect(await writing()).toBe(false);
    });
});
