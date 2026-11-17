import { MessagesProvider } from '@mandor/i18n';
import { createEnvironment } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EnvironmentList } from '../src/components/dialog/EnvironmentList.js';
import { GLOBALS_ROW } from '../src/lib/globals-row.js';

const LOCAL = createEnvironment({ id: 'local', name: 'Local' });
const STAGING = createEnvironment({ id: 'staging', name: 'Staging' });

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

function renderList(overrides: Partial<Parameters<typeof EnvironmentList>[0]> = {}) {
    const handlers = {
        onCreate: vi.fn(),
        onMakeDefault: vi.fn(),
        onRemove: vi.fn(),
        onSelect: vi.fn(),
    };

    render(
        <EnvironmentList
            defaultId={null}
            environments={[LOCAL, STAGING]}
            selectedId={null}
            {...handlers}
            {...overrides}
        />,
        { wrapper: Wrapper },
    );

    return handlers;
}

afterEach(() => {
    cleanup();
});

describe('the list of environments of a workspace', () => {
    it('names every environment and the globals that stand apart above them', () => {
        renderList();

        expect(screen.getByRole('option', { name: 'Globals' })).toBeVisible();
        expect(screen.getByRole('option', { name: 'Local' })).toBeVisible();
        expect(screen.getByRole('option', { name: 'Staging' })).toBeVisible();
    });

    it('selects the globals by their own id, which no environment can have', () => {
        const { onSelect } = renderList();

        fireEvent.click(screen.getByRole('option', { name: 'Globals' }));

        expect(onSelect).toHaveBeenCalledWith(GLOBALS_ROW);
    });

    it('selects the environment that is clicked', () => {
        const { onSelect } = renderList();

        fireEvent.click(screen.getByRole('option', { name: 'Staging' }));

        expect(onSelect).toHaveBeenCalledWith('staging');
    });

    it('marks the row being looked at, and only that one', () => {
        renderList({ selectedId: 'staging' });

        expect(screen.getByRole('option', { name: 'Staging' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
        expect(screen.getByRole('option', { name: 'Local' })).toHaveAttribute(
            'aria-selected',
            'false',
        );
    });

    it('says which environment rules the workspace when nobody chose one', () => {
        renderList({ defaultId: 'local' });

        expect(screen.getByRole('option', { name: 'Local (default)' })).toBeVisible();
        expect(screen.getByRole('option', { name: 'Staging' })).toBeVisible();
    });

    /** The doors of a row belong to the row: using one must not also open the environment. */
    it('makes an environment the default from its own row without selecting it', () => {
        const { onMakeDefault, onSelect } = renderList();
        const staging = within(screen.getByRole('option', { name: 'Staging' }));

        fireEvent.click(staging.getByRole('button', { name: 'Use as default' }));

        expect(onMakeDefault).toHaveBeenCalledWith('staging');
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('removes an environment from its own row without selecting it', () => {
        const { onRemove, onSelect } = renderList();
        const staging = within(screen.getByRole('option', { name: 'Staging' }));

        fireEvent.click(staging.getByRole('button', { name: 'Delete environment' }));

        expect(onRemove).toHaveBeenCalledWith('staging');
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('asks for a new environment with the button under the list', () => {
        const { onCreate } = renderList();

        fireEvent.click(screen.getByRole('button', { name: 'Create environment' }));

        expect(onCreate).toHaveBeenCalledTimes(1);
    });
});
