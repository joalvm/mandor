import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ImportDropzone } from '../../src/import/components/dialog/ImportDropzone.js';
import type { ImportChoice } from '../../src/import/lib/import-choice.js';

import { AppProviders } from '../support/providers.js';

const FORMATS: ImportChoice[] = [
    { label: 'AsyncAPI', hint: '2.x or 3.x, as JSON or YAML', input: 'files' },
    { label: 'HAR', hint: '1.2 recorded by a browser, in JSON', input: 'files' },
];

describe('the ways the import dropzone offers to pick a document', () => {
    it('offers the file dialog of the operating system through its button', () => {
        const onPick = vi.fn();

        render(
            <ImportDropzone
                formats={FORMATS}
                disabled={false}
                loading={false}
                onDrop={vi.fn()}
                onPick={onPick}
                onStop={vi.fn()}
                reading={null}
            />,
            {
                wrapper: AppProviders,
            },
        );

        fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));

        expect(onPick).toHaveBeenCalledExactlyOnceWith('files');
        expect(screen.queryByRole('button', { name: 'Choose folder' })).toBeNull();
    });

    it('offers the folder dialog too when a format lives in a folder', () => {
        const onPick = vi.fn();

        render(
            <ImportDropzone
                formats={[...FORMATS, { label: 'Bruno', hint: 'a folder', input: 'folder' }]}
                disabled={false}
                loading={false}
                onDrop={vi.fn()}
                onPick={onPick}
                onStop={vi.fn()}
                reading={null}
            />,
            { wrapper: AppProviders },
        );

        fireEvent.click(screen.getByRole('button', { name: 'Choose folder' }));

        expect(onPick).toHaveBeenCalledExactlyOnceWith('folder');
        expect(screen.getByRole('button', { name: 'Choose file' })).toBeVisible();
    });

    it('offers only the folder dialog when every format lives in a folder', () => {
        render(
            <ImportDropzone
                formats={[{ label: 'Bruno', hint: 'a folder', input: 'folder' }]}
                disabled={false}
                loading={false}
                onDrop={vi.fn()}
                onPick={vi.fn()}
                onStop={vi.fn()}
                reading={null}
            />,
            { wrapper: AppProviders },
        );

        expect(screen.queryByRole('button', { name: 'Choose file' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Choose folder' })).toBeVisible();
    });
});
