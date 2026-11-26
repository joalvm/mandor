import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { GeneralSection } from '../../../src/components/dialog/GeneralSection.js';
import { PreferencesProvider } from '../../../src/preferences-context.js';
import { PREFERENCE_STORAGE_KEY } from '../../../src/preferences-storage.js';

afterEach(() => {
    cleanup();
});

function renderGeneral() {
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <PreferencesProvider>
                <TooltipProvider>
                    <GeneralSection />
                </TooltipProvider>
            </PreferencesProvider>
        </MessagesProvider>,
    );
}

function kept(): Record<string, unknown> {
    const stored: unknown = JSON.parse(window.localStorage.getItem(PREFERENCE_STORAGE_KEY) ?? '{}');

    return typeof stored === 'object' && stored !== null ? { ...stored } : {};
}

describe('the general section of the settings', () => {
    it('opens with the language, then the interface, then the editor', () => {
        renderGeneral();

        expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
            'Language',
            'Interface',
            'Editor',
        ]);
    });

    it('keeps a switch turned in the interface group for the next window', () => {
        renderGeneral();

        const group = screen.getByRole('region', { name: 'Interface' });

        fireEvent.click(within(group).getByRole('switch', { name: 'Always open in a new tab' }));

        expect(kept()).toMatchObject({ 'tabs.alwaysNew': 'on' });
    });
});
