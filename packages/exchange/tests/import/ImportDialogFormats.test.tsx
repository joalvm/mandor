import { failure, success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ImportDialog } from '../../src/import/components/dialog/ImportDialog.js';
import type { ImportChoice } from '../../src/import/lib/import-choice.js';

import { AppProviders } from '../support/providers.js';

const origin = { kind: 'openapi' as const, sourceId: 'abc' };
const FORMATS: ImportChoice[] = [
    { label: 'OpenAPI', hint: '3.x or Swagger 2.0', input: 'files' },
    { label: 'Postman', hint: 'v2.1 collection', input: 'files' },
];

function open(formats: readonly ImportChoice[] = FORMATS): void {
    render(
        <ImportDialog formats={formats} onClose={vi.fn()} onImported={vi.fn()} scope="workspace" />,
        { wrapper: AppProviders },
    );
}

describe('the import dialog with more than one format', () => {
    beforeEach(() => {
        shellStore.getState().setActiveWorkspace('personal');
        vi.spyOn(bridge.import, 'pick').mockResolvedValue(
            success({ files: [{ path: 'a.json', text: '{}' }] }),
        );
        vi.spyOn(bridge.import, 'plan').mockResolvedValue(
            success({ name: 'A', plan: { identity: origin, entries: [] } }),
        );
    });

    it('asks for no format: it lists every one it takes and lets the file speak', () => {
        open();

        expect(screen.queryByRole('combobox')).toBeNull();
        expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
            'OpenAPI 3.x or Swagger 2.0',
            'Postman v2.1 collection',
        ]);
    });

    it('asks the host for the plan with the files alone, whatever format they are in', async () => {
        open();

        fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));

        await waitFor(() => {
            expect(bridge.import.plan).toHaveBeenCalledWith({
                files: [{ path: 'a.json', text: '{}' }],
                scope: 'workspace',
            });
        });
    });

    it('names the formats it takes when the host knows none for the file', async () => {
        vi.spyOn(bridge.import, 'plan').mockResolvedValue(
            failure('import-format-unknown', 'no listed format recognizes these files'),
        );
        open();

        fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));

        expect(
            await screen.findByText('Mandor does not read this file. It takes: OpenAPI, Postman.'),
        ).toBeVisible();
        expect(screen.queryByRole('tree')).toBeNull();
    });

    /** A pick the host refused is said, not swallowed: the person picked and nothing came. */
    it('says why when the host refuses what was picked', async () => {
        vi.spyOn(bridge.import, 'pick').mockResolvedValue(failure('unknown', 'no'));
        open();

        fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));

        expect(await screen.findByRole('button', { name: 'Choose file' })).toBeVisible();
        await waitFor(() => {
            expect(document.querySelector('[data-part="toast"]')).not.toBeNull();
        });
        expect(screen.queryByRole('tree')).toBeNull();
    });
});
