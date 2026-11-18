import { describe, expect, it, vi } from 'vitest';

const shell = vi.hoisted(() => ({ openExternal: vi.fn(() => Promise.resolve()) }));

vi.mock('electron', () => ({ shell }));

import { openInSystemBrowser } from '../../../src/auth/oauth/open-in-system-browser.js';

describe('openInSystemBrowser', () => {
    it('hands the url to the browser of the system', async () => {
        await openInSystemBrowser('https://idp.example.com/authorize?x=1');

        expect(shell.openExternal).toHaveBeenCalledWith('https://idp.example.com/authorize?x=1');
    });
});
