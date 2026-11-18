import { fireEvent, render, screen, act, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LeaveConflictDialog } from '../src/components/dialog/LeaveConflictDialog.js';
import { conflictDrafts } from '../src/lib/conflict-drafts.js';
import { forgetDrafts, Wrapper } from './support/conflict-fixtures.js';

const TAB = 'conflict:aaaaaaaaaaaaaaaa';

beforeEach(() => {
    forgetDrafts();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('the question when a tab with answers is closed (LeaveConflictDialog)', () => {
    it('stays shut until something asks, and asks only with a draft', async () => {
        render(<LeaveConflictDialog tabId={TAB} />, { wrapper: Wrapper });

        await expect(conflictDrafts.getState().askToLeave(TAB)).resolves.toBe(true);
        expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('lets the tab go on «Close without resolving»', async () => {
        render(<LeaveConflictDialog tabId={TAB} />, { wrapper: Wrapper });
        act(() => {
            conflictDrafts.getState().choose(TAB, 'method', { pick: 'ours' });
        });

        let answer = Promise.resolve(false);

        act(() => {
            answer = conflictDrafts.getState().askToLeave(TAB);
        });

        const dialog = await screen.findByRole('alertdialog', { name: 'Close without resolving?' });

        fireEvent.click(within(dialog).getByRole('button', { name: 'Close without resolving' }));

        await expect(answer).resolves.toBe(true);
        await waitFor(() => {
            expect(screen.queryByRole('alertdialog')).toBeNull();
        });
    });

    it('keeps the tab and its draft on «Stay here»', async () => {
        render(<LeaveConflictDialog tabId={TAB} />, { wrapper: Wrapper });
        act(() => {
            conflictDrafts.getState().choose(TAB, 'method', { pick: 'ours' });
        });

        let answer = Promise.resolve(true);

        act(() => {
            answer = conflictDrafts.getState().askToLeave(TAB);
        });
        fireEvent.click(await screen.findByRole('button', { name: 'Stay here' }));

        await expect(answer).resolves.toBe(false);
        expect(conflictDrafts.getState().hasDraft(TAB)).toBe(true);
    });
});
