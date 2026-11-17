import { MessagesProvider } from '@mandor/i18n';
import { createEnvironment, type Environment } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { allByPart } from '@mandor/ui/testing';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnvironmentPicker, envStore, ManagedEnvironments } from '../src/index.js';

const local = createEnvironment({ id: 'local', name: 'Local' });
const staging = createEnvironment({ id: 'staging', name: 'Staging' });

type PickerHarnessProps = {
    onChange: (environmentId: string | null) => void;
    options: readonly Environment[];
    value: string | null;
};

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <ToastProvider messages={{ close: 'Close', more: (count) => String(count) }}>
                    {children}
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>
    );
}

function show({ onChange, options, value }: PickerHarnessProps): void {
    // The window mounts the dialog once; the picker only asks for it.
    render(
        <>
            <EnvironmentPicker onChange={onChange} options={options} value={value} />
            <ManagedEnvironments />
        </>,
        { wrapper: Wrapper },
    );
}

function openMenu(name: RegExp): void {
    fireEvent.pointerDown(screen.getByRole('button', { name }));
}

beforeEach(() => {
    vi.restoreAllMocks();
    envStore.getState().reset();
    shellStore.getState().reset();
    shellStore.setState({ activeWorkspaceId: 'payments' });
});

describe('the environment picker', () => {
    it('shows the environment it was handed and marks it among the options', () => {
        show({ onChange: () => undefined, options: [local, staging], value: local.id });

        expect(screen.getByRole('button', { name: /Local/u })).toBeVisible();
        openMenu(/Local/u);

        const marked = allByPart('menu-item').filter((item) =>
            item.classList.contains('font-semibold'),
        );

        expect(marked).toHaveLength(1);
    });

    it('names no environment when it was handed none', () => {
        show({ onChange: () => undefined, options: [local], value: null });

        expect(screen.getByRole('button', { name: /No environment/u })).toBeVisible();
    });

    it('reports the chosen environment instead of writing it anywhere', () => {
        const onChange = vi.fn();
        const setActive = vi.spyOn(envStore.getState(), 'setActive');

        show({ onChange, options: [local, staging], value: local.id });
        openMenu(/Local/u);
        fireEvent.click(screen.getByRole('menuitem', { name: 'Staging' }));

        expect(onChange).toHaveBeenCalledWith(staging.id);
        expect(setActive).not.toHaveBeenCalled();
    });

    it('creates an environment in the active workspace when there is none to offer', () => {
        const create = vi.spyOn(envStore.getState(), 'create').mockResolvedValue();

        show({ onChange: () => undefined, options: [], value: null });
        openMenu(/No environment/u);
        fireEvent.click(screen.getByRole('menuitem', { name: 'Create environment' }));

        expect(create).toHaveBeenCalledWith('payments', 'Local');
    });

    it('manages the environments in a dialog instead of opening a tab for them', () => {
        show({ onChange: () => undefined, options: [local], value: local.id });
        openMenu(/Local/u);
        fireEvent.click(screen.getByRole('menuitem', { name: 'Manage environments' }));

        expect(screen.getByRole('dialog', { name: 'Environments' })).toBeVisible();
        expect(shellStore.getState().grid).toEqual({
            kind: 'leaf',
            id: 'root',
            tabs: [],
            activeTab: null,
        });
    });
});
