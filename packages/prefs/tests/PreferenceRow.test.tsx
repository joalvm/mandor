import { MessagesProvider } from '@mandor/i18n';
import { PREFERENCE_DEFINITIONS } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PreferenceRow } from '../src/components/dialog/PreferenceRow.js';

afterEach(() => {
    cleanup();
});

const MODE = PREFERENCE_DEFINITIONS.find((definition) => definition.key === 'appearance.themeMode');

describe('a preference as a row of the settings', () => {
    it('names the choice, says what it means and writes the option picked', async () => {
        const onValueChange = vi.fn();

        if (MODE === undefined) {
            throw new Error('the theme mode preference is gone');
        }

        render(
            <MessagesProvider preferences={{ language: 'en' }}>
                <TooltipProvider>
                    <PreferenceRow definition={MODE} onValueChange={onValueChange} value="system" />
                </TooltipProvider>
            </MessagesProvider>,
        );

        const choice = screen.getByRole('combobox', { name: 'Appearance' });

        expect(choice).toHaveAccessibleDescription(
            'Follow the system, with a theme for day and another for night, or hold one theme.',
        );

        fireEvent.keyDown(choice, { key: 'ArrowDown' });
        fireEvent.click(await screen.findByRole('option', { name: 'Hold one theme' }));

        expect(onValueChange).toHaveBeenCalledWith('appearance.themeMode', 'manual');
    });
});
