import { beforeEach, describe, expect, it, vi } from 'vitest';

import { windowOf } from '../../src/window/window-of.js';

const { BrowserWindow } = vi.hoisted(() => ({
    BrowserWindow: { fromWebContents: vi.fn() },
}));

vi.mock('electron', () => ({ BrowserWindow }));

beforeEach(() => {
    BrowserWindow.fromWebContents.mockReset();
});

describe('looking up the window that sent a message', () => {
    it('resolves the window through the sender the message traveled on', () => {
        const target = { close: vi.fn() };

        BrowserWindow.fromWebContents.mockReturnValue(target);

        expect(windowOf({ sender: { id: 1 } })).toBe(target);
        expect(BrowserWindow.fromWebContents).toHaveBeenCalledWith({ id: 1 });
    });

    it('answers nothing when the message carries no sender', () => {
        expect(windowOf({})).toBeUndefined();
        expect(windowOf(undefined)).toBeUndefined();
        expect(BrowserWindow.fromWebContents).not.toHaveBeenCalled();
    });

    it('answers nothing when the window the sender belonged to is gone', () => {
        BrowserWindow.fromWebContents.mockReturnValue(null);

        expect(windowOf({ sender: { id: 2 } })).toBeUndefined();
    });
});
