import { MessagesProvider } from '@mandor/i18n';
import { success } from '@mandor/ipc';
import { bridge } from '@mandor/shell';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AboutSection } from '../src/components/dialog/AboutSection.js';

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
    vi.restoreAllMocks();
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    vi.spyOn(bridge.app, 'about').mockResolvedValue(
        success({
            chrome: '130.0.1',
            electron: '33.2.0',
            name: 'Mandor Realtime',
            node: '22.9.0',
            platform: 'win32',
            version: '0.1.0',
        }),
    );
});

afterEach(() => {
    cleanup();
    Reflect.deleteProperty(navigator, 'clipboard');
});

async function draw(): Promise<void> {
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <AboutSection />
            </TooltipProvider>
        </MessagesProvider>,
    );
    await screen.findByText('Version 0.1.0');
}

describe('the about section of the settings', () => {
    it('says which app this is, its version and what it runs on', async () => {
        await draw();

        expect(screen.getByRole('region', { name: 'Mandor Realtime' })).toBeVisible();
        expect(screen.getByText('Electron 33.2.0 · Chromium 130.0.1 · Node 22.9.0')).toBeVisible();
    });

    it('copies the report of the app and says it did', async () => {
        await draw();
        fireEvent.click(screen.getByRole('button', { name: 'Copy information' }));

        expect(await screen.findByRole('button', { name: 'Copied' })).toBeVisible();
        expect(writeText).toHaveBeenCalledWith(
            [
                'Mandor Realtime 0.1.0',
                'Electron 33.2.0 · Chromium 130.0.1 · Node 22.9.0',
                'Platform win32',
            ].join('\n'),
        );
    });

    /** The window names no path: main knows where the install keeps its licenses. */
    it('asks main to show the licenses', async () => {
        const open = vi.spyOn(bridge.app, 'openLicenses').mockResolvedValue(success({}));

        await draw();
        fireEvent.click(screen.getByRole('button', { name: 'View licenses' }));

        expect(open).toHaveBeenCalledTimes(1);
    });
});
