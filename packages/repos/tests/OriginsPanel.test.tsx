import { MessagesProvider } from '@mandor/i18n';
import { success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { createLocalOrigin, createOrigin } from '@mandor/schema';
import { bridge, shellStore } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OriginsPanel } from '../src/components/panel/OriginsPanel.js';

const fakeBridge = bridge as FakeBridge;
const LOCAL = createLocalOrigin('Local');
const TEAM = createOrigin({ id: 'team', name: 'Team', url: 'https://github.com/team/api.git' });

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <ToastProvider
                    messages={{ close: 'Close', more: (count: number) => `${String(count)} more` }}
                >
                    {children}
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>
    );
}

/** The inputs are contenteditable: typing is setting the text and letting the input event fly. */
function type(name: string, value: string): void {
    const box = screen.getByRole('textbox', { name });

    box.textContent = value;
    fireEvent.input(box);
}

function rowMenuOf(name: string): void {
    const row = screen.getAllByRole('row').find((each) => within(each).queryByText(name) !== null);

    if (row === undefined) {
        throw new Error(`no row names ${name}`);
    }

    fireEvent.pointerDown(within(row).getByRole('button', { name: 'Origins actions' }), {
        button: 0,
        ctrlKey: false,
        pointerType: 'mouse',
    });
}

/** The panel lists and checks as it opens; the flush lets those answers land inside act. */
async function panel(onSwitch = vi.fn()): Promise<void> {
    render(<OriginsPanel onSwitch={onSwitch} />, { wrapper: Wrapper });
    await act(() => Promise.resolve());
}

beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(fakeBridge.origin, 'list').mockResolvedValue(success([LOCAL, TEAM]));
    shellStore.getState().reset();
    shellStore.getState().setOrigins([LOCAL, TEAM]);
    await act(() => shellStore.getState().loadSession(LOCAL.id));
});

describe('the origins panel', () => {
    it('lists every origin in its table, the local one first', async () => {
        await panel();

        expect(screen.getByRole('cell', { name: 'Local' })).toBeVisible();
        expect(screen.getByRole('cell', { name: 'Team' })).toBeVisible();
    });

    it('checks every remote origin when the tab opens, and paints the answer', async () => {
        const check = vi.spyOn(fakeBridge.origin, 'check');

        await panel();

        await vi.waitFor(() => {
            expect(check).toHaveBeenCalledWith({ id: 'team' });
            expect(screen.getByRole('img', { name: 'Reachable' })).toBeVisible();
        });
    });

    it('paints the origins that do not answer as such', async () => {
        vi.spyOn(fakeBridge.origin, 'check').mockResolvedValue(
            success({ id: 'team', reachable: false }),
        );

        await panel();

        await vi.waitFor(() => {
            expect(screen.getByRole('img', { name: 'No response' })).toBeVisible();
        });
    });

    it('renames a remote origin in place', async () => {
        const rename = vi.spyOn(fakeBridge.origin, 'rename');

        await panel();
        rowMenuOf('Team');
        fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));
        type('Name', 'Mirror');
        await act(() => {
            fireEvent.keyDown(screen.getByRole('textbox', { name: 'Name' }), { key: 'Enter' });

            return Promise.resolve();
        });

        await vi.waitFor(() => {
            expect(rename).toHaveBeenCalledWith({ id: 'team', name: 'Mirror' });
        });
    });

    it('removes a remote origin, and returns to local when it was the one in use', async () => {
        const remove = vi.spyOn(fakeBridge.origin, 'remove');
        const onSwitch = vi.fn();

        shellStore.setState({ activeOriginId: 'team' });
        await panel(onSwitch);
        rowMenuOf('Team');
        fireEvent.click(screen.getByRole('menuitem', { name: 'Remove from list' }));

        const dialog = await screen.findByRole('alertdialog', { name: 'Remove Team?' });
        const confirm = within(dialog).getByRole('button', { name: 'Remove Team' });
        const box = within(dialog).getByRole('textbox', { name: 'Team' });

        box.textContent = 'Team';
        fireEvent.input(box);
        await act(() => {
            fireEvent.click(confirm);

            return Promise.resolve();
        });

        await vi.waitFor(() => {
            expect(remove).toHaveBeenCalledWith({ id: 'team' });
        });
        expect(onSwitch).toHaveBeenCalledWith('local');
    });

    it('adds the origin from the dialog and reads the list again', async () => {
        const added = vi.spyOn(fakeBridge.origin, 'add');
        const listed = vi.spyOn(fakeBridge.origin, 'list');

        await panel();
        fireEvent.click(screen.getByRole('button', { name: 'Add origins' }));
        type('Name', 'Mirror');
        type('Address', 'https://github.com/team/mirror.git');
        await act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Add' }));

            return Promise.resolve();
        });
        await vi.waitFor(() => {
            expect(added).toHaveBeenCalledWith({
                name: 'Mirror',
                url: 'https://github.com/team/mirror.git',
            });
            expect(listed).toHaveBeenCalled();
        });
    });

    it('empties an origin only after its name is typed by hand', async () => {
        const emptied = vi.spyOn(fakeBridge.origin, 'empty');

        await panel();
        rowMenuOf('Team');
        fireEvent.click(screen.getByRole('menuitem', { name: 'Empty' }));

        const dialog = await screen.findByRole('alertdialog');
        const confirm = within(dialog).getByRole('button', { name: 'Empty Team' });

        expect(confirm).toBeDisabled();

        const box = within(dialog).getByRole('textbox', { name: 'Team' });

        box.textContent = 'Team';
        fireEvent.input(box);
        await act(() => {
            fireEvent.click(confirm);

            return Promise.resolve();
        });

        await vi.waitFor(() => {
            expect(emptied).toHaveBeenCalledWith({ id: 'team' });
        });
    });
});
