import { success } from '@mandor/ipc';
import { bridge } from '@mandor/shell';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ScriptMarks } from '../../../../src/renderer/features/requests/components/response/ScriptMarks.js';
import type { ScriptOutput } from '../../../../src/renderer/response/lib/script-output.js';
import { AppProviders } from '../../support/app-providers.js';

const LEFT_OUT: ScriptOutput = {
    logs: [],
    tests: [],
    skipped: [
        {
            name: 'altas',
            level: 'folder',
            event: 'onBeforeRequest',
            bytes: 12,
            source: 'mandor.variables.set(1);',
        },
    ],
    imported: 0,
    switchedOff: 0,
    errors: [],
    withheld: [],
    destinationMoved: false,
};

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('the mark of the scripts a send left out', () => {
    it('opens them to read and approve, in the workspace of the send', async () => {
        const approve = vi
            .spyOn(bridge.scripts, 'approve')
            .mockResolvedValue(success({ approved: true }));

        render(<ScriptMarks output={LEFT_OUT} workspaceId="pagos" />, { wrapper: AppProviders });

        expect(screen.queryByRole('dialog')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Review' }));

        expect(screen.getByRole('dialog', { name: '1 script left out' })).toBeVisible();
        expect((await editorAt(0)).text()).toBe('mandor.variables.set(1);');

        fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

        expect(approve).toHaveBeenCalledWith({
            workspaceId: 'pagos',
            level: 'folder',
            event: 'onBeforeRequest',
            source: 'mandor.variables.set(1);',
        });
        expect(await screen.findByText('Approved: it runs from the next send')).toBeVisible();
    });

    it('only tells, with no way to approve, when the send has no workspace', () => {
        render(<ScriptMarks output={LEFT_OUT} workspaceId={undefined} />, {
            wrapper: AppProviders,
        });

        expect(screen.getByText('Sent without 1 unapproved script')).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Review' })).toBeNull();
    });
});
