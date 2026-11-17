import { diffEditorAt } from '@mandor/ui/testing/diff-editors-in';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BodyDiff } from '../../../../src/renderer/features/history/components/diff/BodyDiff.js';
import { HeadersDiff } from '../../../../src/renderer/features/history/components/diff/HeadersDiff.js';
import { headerDiff } from '../../../../src/renderer/features/history/lib/header-diff.js';
import { AppProviders } from '../../support/app-providers.js';

afterEach(cleanup);

describe('the body of a comparison', () => {
    it('puts both texts in the diff editor, read only, the earlier one on the left', async () => {
        render(
            <BodyDiff
                change={{
                    after: 'keep\nnew',
                    before: 'keep\ngone',
                    kind: 'text',
                    language: 'plaintext',
                }}
            />,
            { wrapper: AppProviders },
        );

        const group = screen.getByRole('group', { name: 'Body' });
        const editor = await diffEditorAt(0);

        expect(group).toHaveAttribute('data-read-only', 'true');
        expect(editor.original()).toBe('keep\ngone');
        expect(editor.modified()).toBe('keep\nnew');
    });

    it('says only that two bodies match when they are not shown by line', () => {
        render(<BodyDiff change={{ kind: 'opaque', same: true }} />, { wrapper: AppProviders });

        expect(screen.getByText('The bodies are identical.')).toBeVisible();
        expect(screen.queryByRole('group', { name: 'Body' })).toBeNull();
    });

    it('says why they are not shown by line when they differ', () => {
        render(<BodyDiff change={{ kind: 'opaque', same: false }} />, { wrapper: AppProviders });

        expect(screen.getByText(/The bodies differ/)).toBeVisible();
    });

    it('says neither response has a body', () => {
        render(<BodyDiff change={{ kind: 'empty' }} />, { wrapper: AppProviders });

        expect(screen.getByText('Neither response has a body.')).toBeVisible();
    });
});

describe('the headers of a comparison', () => {
    it('tells added, removed, changed and unchanged apart, by word as well as by tint', () => {
        render(
            <HeadersDiff
                rows={headerDiff(
                    [
                        ['x-gone', '1'],
                        ['etag', 'a'],
                        ['server', 'x'],
                    ],
                    [
                        ['x-new', '1'],
                        ['etag', 'b'],
                        ['server', 'x'],
                    ],
                )}
            />,
            { wrapper: AppProviders },
        );

        const rows = within(screen.getByRole('table', { name: 'Headers' }))
            .getAllByRole('row')
            .slice(1);

        expect(rows.map((row) => row.getAttribute('data-change'))).toEqual([
            'removed',
            'changed',
            'same',
            'added',
        ]);
        expect(
            within(screen.getByRole('row', { name: /x-gone/ })).getByText('Removed'),
        ).toBeInTheDocument();
        expect(
            within(screen.getByRole('row', { name: /x-new/ })).getByText('Added'),
        ).toBeInTheDocument();
    });

    it('says neither response has headers', () => {
        render(<HeadersDiff rows={[]} />, { wrapper: AppProviders });

        expect(screen.getByText('Neither response has headers.')).toBeVisible();
    });
});
