import type * as Shell from '@mandor/shell';
import type * as Ui from '@mandor/ui';
import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const spies = vi.hoisted(() => ({
    registerLooseRequests: vi.fn(() => vi.fn()),
    registerShellCommands: vi.fn(() => vi.fn()),
    saveOnClose: vi.fn(() => vi.fn()),
    signCreatedStyles: vi.fn(),
    warmEditorWhenIdle: vi.fn(),
}));

// The window boots from this file and it is what this file is about: everything it wires is
// tested where it lives, so each piece is doubled and what is asserted is the wiring.
vi.mock('@mandor/ui', async () => {
    const ui = await vi.importActual<typeof Ui>('@mandor/ui');

    return {
        ...ui,
        signCreatedStyles: spies.signCreatedStyles,
        warmEditorWhenIdle: spies.warmEditorWhenIdle,
    };
});
vi.mock('@mandor/shell', async () => {
    const shell = await vi.importActual<typeof Shell>('@mandor/shell');

    return {
        ...shell,
        registerShellCommands: spies.registerShellCommands,
        saveOnClose: spies.saveOnClose,
    };
});
vi.mock('@mandor/prefs', () => ({
    PreferencesApplication: ({ children }: { children: unknown }) => children,
    PreferencesProvider: ({ children }: { children: unknown }) => children,
}));
vi.mock('../../../src/renderer/app/SyncApp.js', () => ({ SyncApp: () => <p>Sync vivo</p> }));
vi.mock('../../../src/renderer/features/requests/index.js', () => ({
    registerLooseRequests: spies.registerLooseRequests,
}));

beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '';
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('mount-sync', () => {
    it('registers what the window is made of, draws the app and warms the editor', async () => {
        document.body.innerHTML = '<div id="root"></div>';

        // The module draws the window as it loads; the first frame lands inside act.
        await act(async () => {
            await import('../../../src/renderer/app/mount-sync.js');
        });

        expect(await screen.findByText('Sync vivo')).toBeTruthy();
        expect(spies.signCreatedStyles).toHaveBeenCalledOnce();
        expect(spies.registerLooseRequests).toHaveBeenCalledOnce();
        expect(spies.registerShellCommands).toHaveBeenCalledOnce();
        expect(spies.saveOnClose).toHaveBeenCalledOnce();
        expect(spies.warmEditorWhenIdle).toHaveBeenCalledOnce();
    });

    it('refuses to start in a page without its root', async () => {
        await expect(import('../../../src/renderer/app/mount-sync.js')).rejects.toThrow(
            'renderer root is missing',
        );
    });
});
