import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ImportButtonDoor } from '../../src/import/components/dialog/ImportButtonDoor.js';

import { AppProviders } from '../support/providers.js';

describe('the door of the whole workspace import', () => {
    it('is a button with words that opens the import', () => {
        const onOpen = vi.fn();

        render(<ImportButtonDoor onOpen={onOpen} />, { wrapper: AppProviders });
        fireEvent.click(screen.getByRole('button', { name: 'Import a workspace' }));

        expect(onOpen).toHaveBeenCalledTimes(1);
    });
});
