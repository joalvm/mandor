import { MessagesProvider } from '@mandor/i18n';
import { createLocalOrigin, createOrigin } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { byPart } from '@mandor/ui/testing';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OriginMenu } from '../src/index.js';

const LOCAL = createLocalOrigin('Local');
const TEAM = createOrigin({
    id: 'equipo',
    name: 'Equipo',
    url: 'https://github.com/equipo/api.git',
});

function Wrapper({ children }: { children: ReactNode }) {
    return <MessagesProvider preferences={{ language: 'en' }}>{children}</MessagesProvider>;
}

function renderMenu(onSwitch = vi.fn(), onManage = vi.fn()) {
    return render(<OriginMenu onManage={onManage} onSwitch={onSwitch} />, { wrapper: Wrapper });
}

function openMenu(): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: /Local/ }), {
        button: 0,
        ctrlKey: false,
        pointerType: 'mouse',
    });
}

beforeEach(async () => {
    shellStore.getState().reset();
    shellStore.getState().setOrigins([LOCAL, TEAM]);
    await act(() => shellStore.getState().loadSession(LOCAL.id));
});

describe('the origin menu', () => {
    it('names the local origin with its icon on the first start', () => {
        renderMenu();

        const trigger = screen.getByRole('button', { name: /Local/ });

        expect(trigger).toBeVisible();
        expect(trigger.querySelector('svg')).not.toBeNull();
    });

    it('lists the origins with the active one marked', () => {
        renderMenu();
        openMenu();

        const local = screen.getByRole('menuitem', { name: 'Local' });
        const team = screen.getByRole('menuitem', { name: 'Equipo' });

        expect(within(local).getByText('Local')).toBeVisible();
        expect(local).toHaveClass('font-semibold');
        expect(team).not.toHaveClass('font-semibold');
    });

    /** Switching has an order only the app knows: the menu asks for it, nothing more. */
    it('asks the application to switch when another origin is chosen', () => {
        const onSwitch = vi.fn();

        renderMenu(onSwitch);
        openMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Equipo' }));

        expect(onSwitch).toHaveBeenCalledWith(TEAM.id);
        expect(shellStore.getState().activeOriginId).toBe(LOCAL.id);
    });

    it('asks nothing when the chosen origin already is the active one', () => {
        const onSwitch = vi.fn();

        renderMenu(onSwitch);
        openMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Local' }));

        expect(onSwitch).not.toHaveBeenCalled();
    });

    /** The local origin has nothing to reach, so its glyph carries no mark of a link. */
    it('leaves the glyph of the local origin unmarked', () => {
        renderMenu();

        expect(byPart('menu-button-glyph')).not.toHaveAttribute('data-tone');
    });

    /** A remote origin says only whether it is reached: a failure is red, anything else green. */
    it.each([
        [{ state: 'clean', busy: false }, 'success'],
        [{ state: 'conflict', busy: false }, 'success'],
        [{ state: 'behind', busy: true }, 'success'],
        [{ state: 'error', busy: false }, 'error'],
    ] as const)('marks the glyph of a remote origin by its link: %j', async (syncState, tone) => {
        await act(() => shellStore.getState().loadSession(TEAM.id));
        act(() => {
            shellStore.getState().setSyncState(syncState);
        });
        renderMenu();

        expect(byPart('menu-button-glyph')).toHaveAttribute('data-tone', tone);
    });

    /** Administration is a tab, never a modal: the menu only asks the app to open it. */
    it('hands management to the application', () => {
        const onManage = vi.fn();

        renderMenu(vi.fn(), onManage);
        openMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Manage origins' }));

        expect(onManage).toHaveBeenCalledTimes(1);
    });
});
