import { MessagesProvider } from '@mandor/i18n';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TabMenu } from '../../../src/components/tab-strip/TabMenu.js';
import { registerShellCommands, shellStore, type Tab } from '../../../src/index.js';
import { declareTabKindSpec } from '../../../src/testing/tab-kind.js';

let undo: (() => void)[] = [];

function doc(id: string): Tab {
    return { id, kind: 'doc', resource: `mandor://demo/payments/doc/${id}.md` };
}

function open(...tabs: Tab[]): void {
    for (const each of tabs) {
        shellStore.getState().openTab(ROOT_GROUP_ID, each);
    }
}

function tabIds(): string[] {
    return leavesOf(shellStore.getState().grid)[0]?.tabs.map((each) => each.id) ?? [];
}

/** The menu of one tab, opened the way a right click opens it. */
async function openMenuOf(tabId: string): Promise<void> {
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TabMenu groupId={ROOT_GROUP_ID} tabId={tabId}>
                <span>{`pill ${tabId}`}</span>
            </TabMenu>
        </MessagesProvider>,
    );
    fireEvent.contextMenu(screen.getByText(`pill ${tabId}`));
    await screen.findByRole('menu');
}

beforeEach(() => {
    undo = [
        registerShellCommands(),
        declareTabKindSpec({
            closable: true,
            icon: 'doc',
            id: 'doc',
            section: 'docs',
            title: (resource) => resource,
        }),
    ];
});

afterEach(() => {
    cleanup();
    shellStore.getState().reset();

    for (const each of undo) {
        each();
    }
});

describe('the menu of a tab', () => {
    it('acts on the tab it was opened on, even when another one is in front', async () => {
        open(doc('one'), doc('two'), doc('three'));
        await openMenuOf('one');

        fireEvent.click(screen.getByRole('menuitem', { name: /^Close the tabs to the right/ }));

        expect(tabIds()).toEqual(['one']);
    });

    it('shows a line that cannot run as disabled instead of leaving it out', async () => {
        open(doc('one'), doc('two'));
        await openMenuOf('two');

        expect(
            screen.getByRole('menuitem', { name: /^Close the tabs to the right/ }),
        ).toHaveAttribute('aria-disabled', 'true');
    });

    it('writes the keys of each line beside it', async () => {
        open(doc('one'));
        await openMenuOf('one');

        expect(screen.getByRole('menuitem', { name: /^Close tab/ })).toHaveTextContent(/W$/u);
    });

    it('offers to keep only a tab that is being looked at', async () => {
        shellStore.getState().openTab(ROOT_GROUP_ID, doc('look'), { preview: true });
        await openMenuOf('look');

        fireEvent.click(screen.getByRole('menuitem', { name: /^Keep the tab open/ }));

        expect(JSON.stringify(shellStore.getState().grid)).not.toContain('preview');
    });

    it('pins a tab, and then offers to let go of it instead', async () => {
        open(doc('one'), doc('two'));
        await openMenuOf('two');

        fireEvent.click(screen.getByRole('menuitem', { name: /^Pin tab/ }));
        cleanup();
        await openMenuOf('two');

        expect(tabIds()).toEqual(['two', 'one']);
        expect(screen.queryByRole('menuitem', { name: /^Pin tab/ })).toBeNull();
        expect(screen.getByRole('menuitem', { name: /^Unpin tab/ })).toBeVisible();
    });

    it('has no rename and no closing of the saved for a doc', async () => {
        open(doc('readme'));
        await openMenuOf('readme');

        expect(screen.queryByRole('menuitem', { name: 'Rename' })).toBeNull();
        expect(screen.queryByRole('menuitem', { name: /^Close the saved tabs/ })).toBeNull();
        expect(screen.getByRole('menuitem', { name: /^Show in the sidebar/ })).toBeVisible();
    });
});
