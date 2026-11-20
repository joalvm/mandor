import { MessagesProvider } from '@mandor/i18n';
import { createLocalOrigin, createOrigin } from '@mandor/schema';
import type { SyncNotice } from '@mandor/shell';
import { TooltipProvider } from '@mandor/ui';
import { byPart } from '@mandor/ui/testing';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { OriginRow } from '../src/components/panel/OriginRow.js';
import type { OriginHealth } from '../src/lib/origin-health.js';

const LOCAL = createLocalOrigin('Local');
const TEAM = createOrigin({ id: 'team', name: 'Team', url: 'https://github.com/team/api.git' });

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

function row(
    origin = TEAM,
    health: OriginHealth = 'reachable',
    renaming = false,
    notice: SyncNotice | null = null,
): void {
    render(
        <table>
            <tbody>
                <OriginRow
                    active={false}
                    health={health}
                    notice={notice}
                    onCheck={vi.fn()}
                    onEmpty={vi.fn()}
                    onRemove={vi.fn()}
                    onRenameCancel={vi.fn()}
                    onRenameCommit={vi.fn()}
                    onRenameRequest={vi.fn()}
                    origin={origin}
                    renaming={renaming}
                />
            </tbody>
        </table>,
        { wrapper: Wrapper },
    );
}

describe('one origin of the table (OriginRow)', () => {
    it('carries the name, and where the work lives, in its cells', () => {
        row();

        expect(screen.getByRole('cell', { name: 'Team' })).toBeVisible();
        expect(screen.getByRole('cell', { name: 'https://github.com/team/api.git' })).toBeVisible();
    });

    /** An origin is a thing to act on: its menu stands in sight at rest, not only on hover. */
    it('keeps its actions in sight', () => {
        row();

        expect(byPart('table-row-actions')).toHaveAttribute('data-reveal', 'always');
    });

    it('says the local one lives on this machine instead of an address', () => {
        row(LOCAL, 'available');

        expect(screen.getByRole('cell', { name: 'On this machine' })).toBeVisible();
    });

    it('paints the health it was handed', () => {
        row(TEAM, 'unreachable');

        expect(screen.getByRole('img', { name: 'No response' })).toBeVisible();
    });

    it.each([
        ['syncing', 'Syncing…'],
        ['syncFailed', 'Could not sync'],
        ['syncConflict', 'There are conflicts'],
    ] as const)(
        'says %s in place of the health when the origin has something to say',
        (notice, text) => {
            row(TEAM, 'reachable', false, notice);

            expect(screen.getByText(text)).toBeVisible();
            expect(screen.queryByText('Reachable')).toBeNull();
        },
    );

    it('hands the rename over in place', () => {
        const onRenameCommit = vi.fn();

        render(
            <table>
                <tbody>
                    <OriginRow
                        active={false}
                        health="reachable"
                        notice={null}
                        onCheck={vi.fn()}
                        onEmpty={vi.fn()}
                        onRemove={vi.fn()}
                        onRenameCancel={vi.fn()}
                        onRenameCommit={onRenameCommit}
                        onRenameRequest={vi.fn()}
                        origin={TEAM}
                        renaming
                    />
                </tbody>
            </table>,
            { wrapper: Wrapper },
        );
        const field = screen.getByRole('textbox', { name: 'Name' });

        field.textContent = 'Team mirror';
        fireEvent.input(field);
        fireEvent.keyDown(field, { key: 'Enter' });

        expect(onRenameCommit).toHaveBeenCalledWith('Team mirror');
    });
});
