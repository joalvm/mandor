import { describe, expect, it, vi } from 'vitest';

import { windowOpenHandler } from '../../src/window/window-open-handler.js';

describe('the window open handler', () => {
    it('denies every scheme, so nothing opens a second renderer', () => {
        const handler = windowOpenHandler(vi.fn());
        const urls = [
            'https://mandor.dev',
            'http://mandor.dev',
            'file:///etc/passwd',
            'javascript:alert(1)',
        ];

        for (const url of urls) {
            expect(handler({ url })).toEqual({ action: 'deny' });
        }
    });

    it('hands a https link to the browser of the user', () => {
        const openExternal = vi.fn();
        const handler = windowOpenHandler(openExternal);

        handler({ url: 'https://mandor.dev/docs' });

        expect(openExternal).toHaveBeenCalledWith('https://mandor.dev/docs');
    });

    it('hands a mailto link to the mail client of the user', () => {
        const openExternal = vi.fn();
        const handler = windowOpenHandler(openExternal);

        handler({ url: 'mailto:hola@mandor.dev' });

        expect(openExternal).toHaveBeenCalledWith('mailto:hola@mandor.dev');
    });

    it('never hands the operating system a scheme that reads or runs', () => {
        const openExternal = vi.fn();
        const handler = windowOpenHandler(openExternal);

        handler({ url: 'http://mandor.dev' });
        handler({ url: 'file:///etc/passwd' });
        handler({ url: 'javascript:alert(1)' });
        handler({ url: 'not a url' });

        expect(openExternal).not.toHaveBeenCalled();
    });
});
