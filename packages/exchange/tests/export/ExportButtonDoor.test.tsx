import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExportButtonDoor } from '../../src/export/components/dialog/ExportButtonDoor.js';

import { AppProviders } from '../support/providers.js';

describe('the door of the whole workspace export', () => {
    it('is a button that opens the export on the workspace, naming no collection', () => {
        const onOpen = vi.fn();

        render(<ExportButtonDoor onOpen={onOpen} />, { wrapper: AppProviders });
        fireEvent.click(screen.getByRole('button', { name: 'Export a workspace' }));

        expect(onOpen).toHaveBeenCalledWith();
    });
});
