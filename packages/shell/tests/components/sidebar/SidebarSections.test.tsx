import { MessagesProvider } from '@mandor/i18n';
import { byPart } from '@mandor/ui/testing';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SidebarSections } from '../../../src/components/sidebar/SidebarSections.js';
import { mountSidebarSection } from '../../support/mount-sidebar.js';

const cleanups: (() => void)[] = [];

const mounts = new Map<string, number>();

/** Counts its own mounts, so a section drawn again after a tear-down cannot pass for one kept. */
function Mounted({ label }: { label: string }) {
    const [count] = useState(() => {
        const seen = (mounts.get(label) ?? 0) + 1;

        mounts.set(label, seen);

        return seen;
    });

    return <span>{`${label} ${String(count)}`}</span>;
}

function keep(...takeDowns: (() => void)[]): void {
    cleanups.push(...takeDowns);
}

function sections(collapsed: readonly string[], onCollapsedChange: (ids: string[]) => void) {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <SidebarSections collapsed={collapsed} onCollapsedChange={onCollapsedChange} />
        </MessagesProvider>
    );
}

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }

    mounts.clear();
});

describe('the sections of the sidebar', () => {
    it('draws what was declared in the order each one asked for', () => {
        keep(
            mountSidebarSection({
                id: 'docs',
                order: 20,
                body: <span>guía</span>,
                title: 'shell:commandPalette',
            }),
        );
        keep(
            mountSidebarSection({
                id: 'connections',
                order: 10,
                body: <span>gateway</span>,
                title: 'connections:heading',
            }),
        );
        render(sections([], vi.fn()));

        expect(screen.getAllByRole('button').map((heading) => heading.textContent)).toEqual([
            'Conexiones',
            'Paleta de comandos',
        ]);
    });

    /** The header of a section is where the feature puts whatever creates inside it. */
    it('hands the header of a section to the actions it declared', () => {
        const onCreate = vi.fn();

        keep(
            mountSidebarSection({
                actions: (
                    <button onClick={onCreate} type="button">
                        Nueva conexión
                    </button>
                ),
                id: 'connections',
                order: 10,
                body: <span>gateway</span>,
                title: 'connections:heading',
            }),
        );
        render(sections([], vi.fn()));
        fireEvent.click(screen.getByRole('button', { name: 'Nueva conexión' }));

        expect(onCreate).toHaveBeenCalledTimes(1);
    });

    it('comes back folded for whatever the session says was folded', () => {
        keep(
            mountSidebarSection({
                id: 'connections',
                order: 10,
                body: <span>gateway</span>,
                title: 'connections:heading',
            }),
        );
        render(sections(['connections'], vi.fn()));

        expect(screen.getByRole('button', { name: 'Conexiones' })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
        expect(screen.queryByText('gateway')).toBeNull();
    });

    /** Folding is not kept here: the session is told, and the section comes back as it was told. */
    it('reports the section that was folded and the one that was opened again', () => {
        const onCollapsedChange = vi.fn();

        keep(
            mountSidebarSection({
                id: 'connections',
                order: 10,
                body: <span>gateway</span>,
                title: 'connections:heading',
            }),
        );

        const { rerender } = render(sections([], onCollapsedChange));

        fireEvent.click(screen.getByRole('button', { name: 'Conexiones' }));

        expect(onCollapsedChange).toHaveBeenLastCalledWith(['connections']);

        rerender(sections(['connections'], onCollapsedChange));
        fireEvent.click(screen.getByRole('button', { name: 'Conexiones' }));

        expect(onCollapsedChange).toHaveBeenLastCalledWith([]);
    });

    /** Closing a line closes what it holds: the section is asked to fold its own, only then. */
    it('folds what a section holds when it is folded, and not when it is opened again', () => {
        const onFold = vi.fn();

        keep(
            mountSidebarSection({
                id: 'connections',
                onFold,
                order: 10,
                body: <span>gateway</span>,
                title: 'connections:heading',
            }),
        );

        const { rerender } = render(sections([], vi.fn()));

        fireEvent.click(screen.getByRole('button', { name: 'Conexiones' }));

        expect(onFold).toHaveBeenCalledTimes(1);

        rerender(sections(['connections'], vi.fn()));
        fireEvent.click(screen.getByRole('button', { name: 'Conexiones' }));

        expect(onFold).toHaveBeenCalledTimes(1);
    });

    /** Sections are independent: one leaving cannot cost the other what it was holding. */
    it('takes away a section that was unmounted without tearing down the rest', () => {
        const unregister = mountSidebarSection({
            id: 'docs',
            order: 20,
            body: <Mounted label="docs" />,
            title: 'shell:commandPalette',
        });

        keep(
            mountSidebarSection({
                id: 'connections',
                order: 10,
                body: <Mounted label="connections" />,
                title: 'connections:heading',
            }),
        );

        const { rerender } = render(sections([], vi.fn()));

        expect(screen.getByText('docs 1')).toBeVisible();

        unregister();
        rerender(sections([], vi.fn()));

        expect(screen.queryByText('docs 1')).toBeNull();
        expect(screen.getByText('connections 1')).toBeVisible();
        expect(byPart('sidebar-sections')).toBeVisible();
    });

    /** jsdom lays nothing out, so who takes the room left is read off what the sheet keys on. */
    it('lets only the open section that fills take the room the others leave', () => {
        keep(
            mountSidebarSection({
                body: <span>docs</span>,
                id: 'docs',
                order: 10,
                title: 'shell:commandPalette',
            }),
            mountSidebarSection({
                body: <span>tree</span>,
                fills: true,
                id: 'collections',
                order: 20,
                title: 'connections:heading',
            }),
        );

        const { rerender } = render(sections([], vi.fn()));
        const slots = () =>
            [...document.querySelectorAll('[data-part="sidebar-slot"]')].map((slot) =>
                slot.getAttribute('data-fills'),
            );

        expect(slots()).toEqual(['false', 'true']);

        rerender(sections(['collections'], vi.fn()));

        expect(slots()).toEqual(['false', 'false']);
    });

    it('offers no seam to resize them by hand', () => {
        keep(
            mountSidebarSection({
                body: <span>docs</span>,
                id: 'docs',
                order: 10,
                title: 'shell:commandPalette',
            }),
            mountSidebarSection({
                body: <span>tree</span>,
                id: 'collections',
                order: 20,
                title: 'connections:heading',
            }),
        );
        render(sections([], vi.fn()));

        expect(screen.queryByRole('separator')).toBeNull();
    });

    /** The header sets a section apart from the one above it; a line would be a second border. */
    it('names each section in its header alone, with no line between sections', () => {
        keep(
            mountSidebarSection({
                body: <span>docs</span>,
                id: 'docs',
                order: 10,
                title: 'shell:commandPalette',
            }),
        );
        render(sections([], vi.fn()));

        expect(byPart('collapsible-title').nextElementSibling).toBeNull();
        expect(byPart('sidebar-slot').className).not.toMatch(/border/);
    });
});
