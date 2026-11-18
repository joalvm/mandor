import { MessagesProvider } from '@mandor/i18n';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NoTabOpen } from '../../../src/renderer/app/NoTabOpen.js';

describe('a group of Mandor Request with no tab in it', () => {
    it('sends the reader to the lateral instead of leaving the group blank', () => {
        render(
            <MessagesProvider preferences={{ language: 'en' }}>
                <NoTabOpen />
            </MessagesProvider>,
        );

        expect(screen.getByText('Select or open an item')).toBeVisible();
        expect(
            screen.getByText('Whatever you open from the sidebar takes a tab of this group.'),
        ).toBeVisible();
    });
});
