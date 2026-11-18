import { MessagesProvider } from '@mandor/i18n';
import { failure, success } from '@mandor/ipc';
import { bridge, conflictResource, conflictTabId, TabProvider } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { diffEditorAt } from '@mandor/ui/testing/diff-editors-in';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConflictTab } from '../src/components/conflict/ConflictTab.js';
import { conflictDrafts } from '../src/lib/conflict-drafts.js';
import { forgetDrafts, REQUEST_CLASH, Wrapper } from './support/conflict-fixtures.js';

const TAB = conflictTabId(REQUEST_CLASH.id);
const RESOURCE = conflictResource('team', 'payments', REQUEST_CLASH.id);
const FORBIDDEN =
    /\b(git|commit|push|pull|merge|branch|head|origin|remote|repository|repositorio|remoto|rama)\b/i;

beforeEach(() => {
    forgetDrafts();
    vi.spyOn(bridge.conflict, 'read').mockResolvedValue(success(REQUEST_CLASH));
});

afterEach(() => {
    vi.restoreAllMocks();
});

async function openTab(): Promise<void> {
    render(
        <TabProvider value={{ resource: RESOURCE, tabId: TAB }}>
            <ConflictTab />
        </TabProvider>,
        { wrapper: Wrapper },
    );
    await screen.findByRole('heading', { level: 1 });
}

function choicesOfTab() {
    return conflictDrafts.getState().choices[TAB];
}

describe('the tab of a conflict (ConflictTab)', () => {
    it('shows one part at a time, named after the entity and the part', async () => {
        await openTab();

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Get users (Headers)');
        expect(screen.getByText('1 of 2')).toBeInTheDocument();

        const table = screen.getByRole('table', { name: 'Headers' });

        expect(within(table).getByRole('columnheader', { name: /Mine/ })).toBeInTheDocument();
        expect(within(table).getByRole('columnheader', { name: /Incoming/ })).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Body' })).toBeNull();
    });

    it('calls a clash whose file carries no name an unnamed file', async () => {
        vi.spyOn(bridge.conflict, 'read').mockResolvedValue(
            success({ ...REQUEST_CLASH, name: '' }),
        );
        await openTab();

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Unnamed file (Headers)',
        );
    });

    it('takes a line from one side and gives it back', async () => {
        await openTab();

        fireEvent.click(screen.getByRole('checkbox', { name: 'Use mine for Accept' }));

        expect(choicesOfTab()).toEqual({ 'headers/Accept#0': { pick: 'ours' } });
        expect(screen.getByText('2 unresolved')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('checkbox', { name: 'Use incoming for Accept' }));

        expect(choicesOfTab()).toEqual({ 'headers/Accept#0': { pick: 'theirs' } });

        fireEvent.click(screen.getByRole('checkbox', { name: 'Use incoming for Accept' }));

        expect(choicesOfTab()).toEqual({});
    });

    it('takes a whole side with the box of its head, and shows only what was taken in the result', async () => {
        await openTab();

        expect(screen.getByText('Tick the lines you want to keep.')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('checkbox', { name: 'Select all incoming' }));

        expect(choicesOfTab()).toEqual({
            'headers/Accept#0': { pick: 'theirs' },
            'headers/X-Trace#0': { pick: 'theirs' },
        });
        expect(screen.getByRole('checkbox', { name: 'Select all incoming' })).toBeChecked();

        expect(document.querySelectorAll('[data-part="result-list"] > li')).toHaveLength(2);

        fireEvent.click(screen.getByRole('checkbox', { name: 'Select all incoming' }));

        expect(choicesOfTab()).toEqual({});
    });

    it('marks a side as partly taken when only some of its lines are', async () => {
        await openTab();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Use mine for Accept' }));

        expect(screen.getByRole('checkbox', { name: 'Select all of mine' })).toHaveAttribute(
            'aria-checked',
            'mixed',
        );
    });

    it('goes from part to part and resolves only from the last one', async () => {
        await openTab();

        expect(screen.queryByRole('button', { name: 'Previous' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Resolve' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Next' }));

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Get users (Body)');
        expect(screen.getByText('2 of 2')).toBeInTheDocument();
        expect((await diffEditorAt(0)).original()).toBe('one\ntheirs\n');
        expect(screen.getByRole('button', { name: 'Resolve' })).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Previous' }));

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Get users (Headers)');
    });

    it('writes the answers down when everything is answered, and says so', async () => {
        const resolve = vi.spyOn(bridge.conflict, 'resolve').mockResolvedValue(success({}));

        await openTab();
        act(() => {
            conflictDrafts.getState().choose(TAB, 'headers/Accept#0', { pick: 'ours' });
            conflictDrafts.getState().choose(TAB, 'headers/X-Trace#0', { pick: 'theirs' });
            conflictDrafts.getState().choose(TAB, 'body/content', { text: 'mine\n' });
        });
        await screen.findByText('All resolved');
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));

        expect(await screen.findByText('Conflict resolved')).toBeInTheDocument();
        expect(resolve).toHaveBeenCalledWith({
            choices: {
                'body/content': { text: 'mine\n' },
                'headers/Accept#0': { pick: 'ours' },
                'headers/X-Trace#0': { pick: 'theirs' },
            },
            id: REQUEST_CLASH.id,
        });
    });

    it('keeps this copy when asked, without the answers', async () => {
        const keepMine = vi.spyOn(bridge.conflict, 'keepMine').mockResolvedValue(success({}));

        await openTab();
        fireEvent.click(screen.getByRole('button', { name: 'Keep mine' }));

        expect(await screen.findByText('Conflict resolved')).toBeInTheDocument();
        expect(keepMine).toHaveBeenCalledWith({ id: REQUEST_CLASH.id });
    });

    it('says there is nothing to resolve when the conflict is gone', async () => {
        vi.spyOn(bridge.conflict, 'read').mockResolvedValue(failure('unknown', 'gone'));
        render(
            <TabProvider value={{ resource: RESOURCE, tabId: TAB }}>
                <ConflictTab />
            </TabProvider>,
            { wrapper: Wrapper },
        );

        expect(await screen.findByText('Nothing to resolve')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Resolve' })).toBeNull();
    });

    it.each(['en', 'es'] as const)('says nothing of git in %s', async (language) => {
        function InLanguage({ children }: { children: ReactNode }) {
            return (
                <MessagesProvider preferences={{ language }}>
                    <TooltipProvider>
                        <ToastProvider messages={{ close: 'Close', more: () => '' }}>
                            {children}
                        </ToastProvider>
                    </TooltipProvider>
                </MessagesProvider>
            );
        }

        render(
            <TabProvider value={{ resource: RESOURCE, tabId: TAB }}>
                <ConflictTab />
            </TabProvider>,
            { wrapper: InLanguage },
        );
        await screen.findByRole('heading', { level: 1 });

        expect(document.body.textContent).not.toMatch(FORBIDDEN);
        expect(document.body.textContent).not.toMatch(/\/Users\/|[A-Z]:\\/);
    });
});
