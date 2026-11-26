import { MessagesProvider } from '@mandor/i18n';
import { PREFERENCE_DEFINITIONS } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PreferenceRow } from '../src/components/dialog/PreferenceRow.js';

afterEach(() => {
    cleanup();
});

function definitionOf(key: string) {
    const definition = PREFERENCE_DEFINITIONS.find((candidate) => candidate.key === key);

    if (definition === undefined) {
        throw new Error(`the preference ${key} is gone`);
    }

    return definition;
}

function renderRow(key: string, value: string) {
    const onValueChange = vi.fn();

    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <PreferenceRow
                    definition={definitionOf(key)}
                    onValueChange={onValueChange}
                    value={value}
                />
            </TooltipProvider>
        </MessagesProvider>,
    );

    return onValueChange;
}

describe('a preference as a row of the settings', () => {
    it('names the choice, says what it means and writes the option picked', async () => {
        const onValueChange = renderRow('appearance.themeMode', 'system');

        const choice = screen.getByRole('combobox', { name: 'Appearance' });

        expect(choice).toHaveAccessibleDescription(
            'Follow the system, with a theme for day and another for night, or hold one theme.',
        );

        fireEvent.keyDown(choice, { key: 'ArrowDown' });
        fireEvent.click(await screen.findByRole('option', { name: 'Hold one theme' }));

        expect(onValueChange).toHaveBeenCalledWith('appearance.themeMode', 'manual');
    });

    it('reads an amount in its unit', async () => {
        const onValueChange = renderRow('history.maxAgeDays', '30');
        const choice = screen.getByRole('combobox', { name: 'Keep sends for' });

        expect(choice).toHaveTextContent('30 days');

        fireEvent.keyDown(choice, { key: 'ArrowDown' });
        fireEvent.click(await screen.findByRole('option', { name: '365 days' }));

        expect(onValueChange).toHaveBeenCalledWith('history.maxAgeDays', '365');
    });

    it('turns an on or off preference with a switch', () => {
        const onValueChange = renderRow('editor.wordWrap', 'on');
        const toggle = screen.getByRole('switch', { name: 'Wrap long lines' });

        expect(toggle).toBeChecked();

        fireEvent.click(toggle);

        expect(onValueChange).toHaveBeenCalledWith('editor.wordWrap', 'off');
    });

    it('writes a value typed by hand as it is typed, with the default of the app as its hint', () => {
        const onValueChange = renderRow('editor.fontFamily', '');
        const field = screen.getByRole('textbox', { name: 'Font family' });

        expect(field).toHaveAttribute('data-placeholder', "Mandor's font");

        field.textContent = 'Fira Code';
        fireEvent.input(field);

        expect(onValueChange).toHaveBeenCalledWith('editor.fontFamily', 'Fira Code');
    });
});
