import { failure, success } from '@mandor/ipc';
import type { SkippedScript } from '@mandor/schema';
import { bridge } from '@mandor/shell';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SkippedScriptsDialog } from '../../../src/components/scripts/SkippedScriptsDialog.js';
import { AppProviders } from '../../support/app-providers.js';

const SEEN: SkippedScript = {
    name: 'altas‮',
    level: 'folder',
    event: 'onBeforeRequest',
    bytes: 12,
    source: 'vars.set(1);',
};

const UNSEEN: SkippedScript = {
    name: 'pedidos',
    level: 'collection',
    event: 'onResponse',
    bytes: 4_096,
};

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

function shown(scripts: readonly SkippedScript[]): void {
    render(
        <AppProviders>
            <SkippedScriptsDialog
                onOpenChange={vi.fn()}
                open
                scripts={scripts}
                workspaceId="pagos"
            />
        </AppProviders>,
    );
}

describe('the scripts a send left out, to review and approve', () => {
    it('names each with its hidden characters written out, and shows its text only to read', async () => {
        shown([SEEN, UNSEEN]);

        expect(screen.getByRole('dialog', { name: '2 scripts left out' })).toBeVisible();
        expect(screen.getByRole('option', { name: 'altas\\u{202E}' })).toBeVisible();
        expect(screen.getByRole('option', { name: 'pedidos' })).toBeVisible();

        const editor = await editorAt(0);

        expect(editor.text()).toBe('vars.set(1);');
        expect(editor.readOnly()).toBe(true);
        expect(editor.wraps()).toBe(true);
        expect(editor.marksHidden()).toBe(true);
    });

    it('approves the text shown, in its place, and says it runs from the next send', async () => {
        const approve = vi
            .spyOn(bridge.scripts, 'approve')
            .mockResolvedValue(success({ approved: true }));

        shown([SEEN]);
        await editorAt(0);
        fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

        expect(approve).toHaveBeenCalledWith({
            workspaceId: 'pagos',
            level: 'folder',
            event: 'onBeforeRequest',
            source: 'vars.set(1);',
        });
        expect(await screen.findByText('Approved: it runs from the next send')).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    });

    it('keeps the button when main does not approve, and says why', async () => {
        vi.spyOn(bridge.scripts, 'approve').mockResolvedValue(failure('fs-write', 'disk full'));

        shown([SEEN]);
        await editorAt(0);
        fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

        expect(await screen.findByText('Mandor could not save the requested file.')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Approve' })).toBeVisible();
    });

    /** Nobody approves a text nobody saw: one that did not fit is sent to its own editor. */
    it('offers no approval for a text that did not come along, only its size and its editor', () => {
        shown([UNSEEN]);

        expect(
            screen.getByText(
                '4096 bytes, too many to show here. Open it in its editor to review it.',
            ),
        ).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
        expect(document.querySelector('[data-part="code-editor"]')).toBeNull();
    });

    it('shows the script picked in the list', async () => {
        shown([UNSEEN, SEEN]);
        fireEvent.click(screen.getByRole('option', { name: 'altas\\u{202E}' }));

        expect((await editorAt(0)).text()).toBe('vars.set(1);');
        expect(screen.getByText('Folder · onBeforeRequest')).toBeVisible();
    });
});
