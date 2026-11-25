import { MessagesProvider } from '@mandor/i18n';
import { success, type AppAbout } from '@mandor/ipc';
import { bridge } from '@mandor/shell';
import { TooltipProvider } from '@mandor/ui';
import { allByPart, byPart } from '@mandor/ui/testing';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AboutSection } from '../src/components/dialog/AboutSection.js';

const ABOUT: AppAbout = {
    arch: 'x64',
    chrome: '130.0.1',
    electron: '33.2.0',
    icon: 'data:image/png;base64,iVBORw0KGgo=',
    name: 'Mandor Realtime',
    node: '22.9.0',
    platform: 'win32',
    system: '10.0.26100',
    version: '0.1.0',
};

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
    vi.restoreAllMocks();
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
});

afterEach(() => {
    cleanup();
    Reflect.deleteProperty(navigator, 'clipboard');
});

async function draw(about: AppAbout = ABOUT): Promise<void> {
    vi.spyOn(bridge.app, 'about').mockResolvedValue(success(about));
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <AboutSection />
            </TooltipProvider>
        </MessagesProvider>,
    );
    await screen.findByRole('heading', { name: about.name });
}

/** Each fact as it reads: the name above, the value under it. */
function facts(): string[][] {
    return allByPart('about-fact').map((fact) => [
        within(fact).getByRole('term').textContent,
        within(fact).getByRole('definition').textContent,
    ]);
}

describe('the about section of the settings', () => {
    /** The name of the app heads the section: there is no title over it. */
    it('names the app under its mark, as the section it heads', async () => {
        await draw();

        expect(screen.getByRole('region', { name: 'Mandor Realtime' })).toBeVisible();
        expect(byPart('about-mark')).toHaveAttribute('src', ABOUT.icon);
        expect(screen.queryByRole('heading', { name: 'About' })).toBeNull();
    });

    it('tells the version and what the app runs on, the system by its name', async () => {
        await draw();

        expect(facts()).toEqual([
            ['Version', '0.1.0'],
            ['Electron', '33.2.0'],
            ['Chromium', '130.0.1'],
            ['Node.js', '22.9.0'],
            ['Operating system', 'Windows 10.0.26100'],
            ['Architecture', 'x64'],
        ]);
    });

    it('shows a system it does not know as Node names it, and no mark when there is none', async () => {
        await draw({ ...ABOUT, icon: '', platform: 'freebsd', system: '14.1' });

        expect(screen.getByText('freebsd 14.1')).toBeVisible();
        expect(allByPart('about-mark')).toEqual([]);
    });

    it('copies the report of the app and says it did', async () => {
        await draw();
        fireEvent.click(screen.getByRole('button', { name: 'Copy information' }));

        expect(await screen.findByRole('button', { name: 'Copied' })).toBeVisible();
        expect(writeText).toHaveBeenCalledWith(
            [
                'Mandor Realtime 0.1.0',
                'Electron 33.2.0 · Chromium 130.0.1 · Node 22.9.0',
                'Platform win32 10.0.26100 x64',
            ].join('\n'),
        );
    });

    /** The window names no path or address: main knows where both are. */
    it('asks main to show the licenses and the website of the app', async () => {
        const licenses = vi.spyOn(bridge.app, 'openLicenses').mockResolvedValue(success({}));
        const website = vi.spyOn(bridge.update, 'openPage').mockResolvedValue(success({}));

        await draw();
        fireEvent.click(screen.getByRole('button', { name: 'Licenses' }));
        fireEvent.click(screen.getByRole('button', { name: 'Website' }));

        expect(licenses).toHaveBeenCalledTimes(1);
        expect(website).toHaveBeenCalledTimes(1);
    });
});
