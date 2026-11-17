import { failure } from '@mandor/ipc';
import { availableCommands, bridge, shellStore, type Command } from '@mandor/shell';
import { cleanup, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { docsStore } from '../src/docs-store.js';
import { useDocCommands } from '../src/hooks/useDocCommands.js';

import { AppProviders } from './support/app-providers.js';
import { flush } from './support/flush.js';

const README = 'mandor://local-apis/events/doc/readme.md';

function commandOf(id: string): Command | undefined {
    return availableCommands(shellStore.getState()).find((command) => command.id === id);
}

function readme(): void {
    const shell = shellStore.getState();

    shell.openTab(shell.activeGroupId, { id: 'doc-1', kind: 'doc', resource: README });
    shellStore.getState().setActiveTab(shell.activeGroupId, 'doc-1');
}

beforeEach(() => {
    vi.restoreAllMocks();
    shellStore.getState().reset();
    docsStore.getState().reset();
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();
    shellStore.getState().reset();
});

describe('the commands of a doc hung off the window', () => {
    it('registers them while the window is mounted and takes them away when it goes', () => {
        const { unmount } = renderHook(
            () => {
                useDocCommands();
            },
            { wrapper: AppProviders },
        );

        readme();

        expect(commandOf('doc.revert')).toBeDefined();

        unmount();

        expect(commandOf('doc.revert')).toBeUndefined();
    });

    /** A command runs outside React, and the toast lives inside it: the tree closes the gap. */
    it('tells the reader where they are looking when a revert is refused', async () => {
        vi.spyOn(bridge.doc, 'revert').mockResolvedValue(failure('fs-read', 'no history'));
        renderHook(
            () => {
                useDocCommands();
            },
            { wrapper: AppProviders },
        );
        readme();

        commandOf('doc.revert')?.run(shellStore.getState());
        await flush();

        expect(screen.getByText('Mandor could not read the requested file.')).toBeVisible();
    });
});
