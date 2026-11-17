import { MessagesProvider } from '@mandor/i18n';
import { createLocalOrigin, createOrigin, type Origin } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OriginTable } from '../src/components/panel/OriginTable.js';

const LOCAL = createLocalOrigin('Local');
const TEAM = createOrigin({ id: 'team', name: 'Team', url: 'https://github.com/team/api.git' });

function tableOf(
    origins: readonly Origin[],
    checks: Readonly<Record<string, 'checking' | boolean | undefined>> = {},
    activeOriginId = 'local',
) {
    return render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <OriginTable
                    activeOriginId={activeOriginId}
                    checks={checks}
                    notice="syncFailed"
                    onCheck={vi.fn()}
                    onEmpty={vi.fn()}
                    onRemove={vi.fn()}
                    onRenameCancel={vi.fn()}
                    onRenameCommit={vi.fn()}
                    onRenameRequest={vi.fn()}
                    origins={origins}
                    renamingId={null}
                />
            </TooltipProvider>
        </MessagesProvider>,
    );
}

describe('OriginTable', () => {
    it('draws one row per origin, with its name and its address', () => {
        tableOf([LOCAL, TEAM]);

        const rows = screen.getAllByRole('row');

        expect(rows).toHaveLength(3);
        expect(screen.getByText('Local')).toBeVisible();
        expect(screen.getByText('Team')).toBeVisible();
        expect(screen.getByText('https://github.com/team/api.git')).toBeVisible();
    });

    it('paints the check of a remote origin that did not answer as the state it is', () => {
        tableOf([TEAM], { [TEAM.id]: false });

        expect(screen.getByRole('img', { name: 'No response' })).toBeVisible();
    });

    it('says the notice only in the row of the open origin', () => {
        tableOf([LOCAL, TEAM], { [TEAM.id]: true }, TEAM.id);

        expect(screen.getAllByText('Could not sync')).toHaveLength(1);
        expect(screen.getByText('Available')).toBeVisible();
    });
});
