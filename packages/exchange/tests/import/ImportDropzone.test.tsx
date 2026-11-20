import type { DragEvent } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ImportDropzone } from '../../src/import/components/dialog/ImportDropzone.js';
import type { ImportChoice } from '../../src/import/lib/import-choice.js';

import { AppProviders } from '../support/providers.js';

const FORMATS: ImportChoice[] = [
    { label: 'AsyncAPI', hint: '2.x or 3.x, as JSON or YAML', input: 'files' },
    { label: 'HAR', hint: '1.2 recorded by a browser, in JSON', input: 'files' },
];

function dropFile(element: Element, text: string): void {
    const file = new File([text], 'pasarela.yaml', { type: 'text/yaml' });
    const drop = new Event('drop', { bubbles: true });

    Object.defineProperty(drop, 'dataTransfer', { value: { files: [file] } });
    element.dispatchEvent(drop);
}

describe('the import dropzone', () => {
    it('hands the dropped file over, with its text ready to read', async () => {
        const onDrop = vi.fn<(event: DragEvent<HTMLDivElement>) => void>();
        const onPick = vi.fn();

        render(
            <ImportDropzone
                formats={FORMATS}
                disabled={false}
                loading={false}
                onDrop={onDrop}
                onPick={onPick}
                onStop={vi.fn()}
                reading={null}
            />,
            {
                wrapper: AppProviders,
            },
        );

        dropFile(screen.getByRole('region', { name: 'Drop the document here' }), 'asyncapi: 3.0.0');

        await waitFor(() => {
            expect(onDrop).toHaveBeenCalledTimes(1);
        });

        expect(onPick).not.toHaveBeenCalled();
    });

    it('says what it is doing while the document is being read', () => {
        render(
            <ImportDropzone
                formats={FORMATS}
                disabled
                loading
                onDrop={vi.fn()}
                onPick={vi.fn()}
                onStop={vi.fn()}
                reading={null}
            />,
            {
                wrapper: AppProviders,
            },
        );

        expect(screen.getByText('Reading the document…')).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Choose file' })).toBeNull();
    });

    it('says how many files it has read, and offers to stop', () => {
        const onStop = vi.fn();

        render(
            <ImportDropzone
                formats={FORMATS}
                disabled
                loading
                onDrop={vi.fn()}
                onPick={vi.fn()}
                onStop={onStop}
                reading={100}
            />,
            { wrapper: AppProviders },
        );

        expect(screen.getByText('Reading files… 100')).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Stop reading' }));

        expect(onStop).toHaveBeenCalledOnce();
    });

    it('says which formats it takes, so nobody drops a document blind', () => {
        render(
            <ImportDropzone
                formats={FORMATS}
                disabled={false}
                loading={false}
                onDrop={vi.fn()}
                onPick={vi.fn()}
                onStop={vi.fn()}
                reading={null}
            />,
            {
                wrapper: AppProviders,
            },
        );

        const takes = screen.getAllByRole('listitem').map((item) => item.textContent);

        expect(takes).toEqual([
            'AsyncAPI 2.x or 3.x, as JSON or YAML',
            'HAR 1.2 recorded by a browser, in JSON',
        ]);
    });

    it('marks itself while a document hovers on it, and lets the mark go after', () => {
        render(
            <ImportDropzone
                formats={FORMATS}
                disabled={false}
                loading={false}
                onDrop={vi.fn()}
                onPick={vi.fn()}
                onStop={vi.fn()}
                reading={null}
            />,
            {
                wrapper: AppProviders,
            },
        );

        const zone = screen.getByRole('region', { name: 'Drop the document here' });

        // At rest it is a box of white on the dialog, never the grey of a panel.
        expect(zone).toHaveClass('bg-surface-raised');

        fireEvent.dragEnter(zone);

        expect(zone).toHaveAttribute('data-over', 'true');

        fireEvent.dragLeave(zone);

        expect(zone).toHaveAttribute('data-over', 'false');
    });

    it('drops the mark when the document lands, even before the drop is read', async () => {
        const onDrop = vi.fn<(event: DragEvent<HTMLDivElement>) => void>();

        render(
            <ImportDropzone
                formats={FORMATS}
                disabled={false}
                loading={false}
                onDrop={onDrop}
                onPick={vi.fn()}
                onStop={vi.fn()}
                reading={null}
            />,
            {
                wrapper: AppProviders,
            },
        );

        const zone = screen.getByRole('region', { name: 'Drop the document here' });

        fireEvent.dragEnter(zone);
        // The zone reads the file on a promise; the drop lands whole inside act.
        await act(() => {
            dropFile(zone, 'asyncapi: 3.0.0');

            return Promise.resolve();
        });

        await waitFor(() => {
            expect(onDrop).toHaveBeenCalledTimes(1);
        });

        expect(zone).toHaveAttribute('data-over', 'false');
    });
});
