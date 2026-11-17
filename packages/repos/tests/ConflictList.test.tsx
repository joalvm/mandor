import type { ConflictSummary } from '@mandor/ipc';
import { selectTabs, shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConflictList } from '../src/components/panel/ConflictList.js';
import { Wrapper } from './support/conflict-fixtures.js';

const CLASH: ConflictSummary = {
    at: '2026-10-07T10:00:00.000Z',
    entity: { area: 'collections', path: 'users/get', workspaceId: 'payments' },
    id: 'aaaaaaaaaaaaaaaa',
    name: 'Get users',
    sections: ['method'],
    source: 'merge',
};

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.setState({ activeOriginId: 'team' });
});

afterEach(() => {
    cleanup();
    shellStore.getState().reset();
});

describe('the clashes listed with the origins (ConflictList)', () => {
    it('is not there while nothing clashes', () => {
        render(<ConflictList conflicts={[]} />, { wrapper: Wrapper });

        expect(screen.queryByRole('region', { name: 'Changes waiting for an answer' })).toBeNull();
    });

    it('lists each clash with a way to its tab, and the way opens it', () => {
        render(<ConflictList conflicts={[CLASH]} />, { wrapper: Wrapper });

        const list = screen.getByRole('region', { name: 'Changes waiting for an answer' });

        expect(within(list).getByRole('heading', { name: 'Conflicts' })).toBeVisible();
        expect(within(list).getByText('Get users')).toBeVisible();

        fireEvent.click(within(list).getByRole('button', { name: 'Resolve' }));

        expect(selectTabs(shellStore.getState()).map((tab) => tab.id)).toEqual([
            `conflict:${CLASH.id}`,
        ]);
    });

    it('calls a clash whose file carries no name an unnamed file', () => {
        render(<ConflictList conflicts={[{ ...CLASH, name: '' }]} />, { wrapper: Wrapper });

        expect(screen.getByText('Unnamed file')).toBeVisible();
    });
});
