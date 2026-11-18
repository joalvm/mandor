import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RequestCodeDialog } from '../../../../src/renderer/features/requests/components/code/RequestCodeDialog.js';
import type { SnippetState } from '../../../../src/renderer/features/requests/hooks/useRequestSnippet.js';
import { AppProviders } from '../../support/app-providers.js';

afterEach(cleanup);

function draw(snippet: SnippetState | null, handlers: { onCopy?: () => void } = {}) {
    const onTargetChange = vi.fn();
    const onOpenChange = vi.fn();

    render(
        <RequestCodeDialog
            onCopy={handlers.onCopy ?? (() => undefined)}
            onOpenChange={onOpenChange}
            onTargetChange={onTargetChange}
            open
            snippet={snippet}
            target="curl"
        />,
        { wrapper: AppProviders },
    );

    return { onOpenChange, onTargetChange };
}

describe('the request as code', () => {
    it('is a dialog with its title and the language the code is written in', () => {
        draw({ state: 'loading' });

        expect(screen.getByRole('dialog', { name: 'Request as code' })).toBeVisible();
        expect(screen.getByRole('combobox', { name: 'Language' })).toHaveTextContent('cURL (bash)');
    });

    it('copies from a glyph beside the language, and keeps no footer', () => {
        draw({ state: 'ready', code: 'curl http://x', leftOutFile: null });

        const bar = document.querySelector('[data-part="request-code-bar"]');
        const copy = screen.getByRole('button', { name: 'Copy' });

        expect(bar).toContainElement(screen.getByRole('combobox', { name: 'Language' }));
        expect(bar).toContainElement(copy);
        expect(copy).not.toHaveTextContent('Copy');
        expect(document.querySelector('[data-part="dialog-footer"]')).toBeNull();
    });

    it('hands over the language the person picks', async () => {
        const { onTargetChange } = draw({ state: 'loading' });

        fireEvent.keyDown(screen.getByRole('combobox', { name: 'Language' }), {
            code: 'ArrowDown',
            key: 'ArrowDown',
        });
        fireEvent.click(await screen.findByRole('option', { name: 'Python requests' }));

        expect(onTargetChange).toHaveBeenCalledWith('python-requests');
    });

    it('offers every language of the writer', async () => {
        draw({ state: 'loading' });

        fireEvent.keyDown(screen.getByRole('combobox', { name: 'Language' }), {
            code: 'ArrowDown',
            key: 'ArrowDown',
        });

        expect(await screen.findAllByRole('option')).toHaveLength(10);
    });

    it('says it is writing, and cannot copy yet', () => {
        draw({ state: 'loading' });

        expect(screen.getByText('Writing the code…')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
    });

    it('also cannot copy while there is nothing to show', () => {
        draw(null);

        expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
    });

    it('shows the code in the one editor of the app and copies it', async () => {
        const onCopy = vi.fn();

        draw({ state: 'ready', code: 'curl http://x', leftOutFile: null }, { onCopy });

        await waitFor(() => {
            expect(
                document.querySelector('[data-part="request-code"] [data-part="code-editor"]'),
            ).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

        expect(onCopy).toHaveBeenCalledTimes(1);
    });

    it('warns that the secrets were hidden', () => {
        draw({ state: 'ready', code: 'curl x', leftOutFile: null });

        expect(screen.getByText(/show as \[redacted\]/)).toBeVisible();
    });

    it('names the body file the code leaves out, only when there is one', () => {
        draw({ state: 'ready', code: 'curl x', leftOutFile: 'payload.bin' });

        expect(
            screen.getByText('The body file payload.bin is not in the code: add it by hand.'),
        ).toBeVisible();

        cleanup();
        draw({ state: 'ready', code: 'curl x', leftOutFile: null });

        expect(screen.queryByText(/is not in the code/)).toBeNull();
    });

    it('tells the failure with the text of its code, and cannot copy', () => {
        draw({ state: 'failed', error: 'snippet-failed' });

        expect(screen.getByText('Mandor could not write the request as code.')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
    });

    it('asks to close from its own way out', () => {
        const { onOpenChange } = draw({ state: 'loading' });

        fireEvent.click(screen.getByRole('button', { name: 'Close' }));

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
