import { describe, expect, it } from 'vitest';

import { navigationPolicy } from '../../src/window/navigation-policy.js';

const DEV_ORIGIN = 'http://localhost:5173';

describe('the navigation policy', () => {
    it('allows the renderer to navigate inside its own origin', () => {
        expect(navigationPolicy(`${DEV_ORIGIN}/index.html`, DEV_ORIGIN)).toBe('allow');
    });

    it('blocks another origin, even one that only looks like it', () => {
        expect(navigationPolicy('http://localhost:5174/', DEV_ORIGIN)).toBe('block');
        expect(navigationPolicy('https://localhost:5173/', DEV_ORIGIN)).toBe('block');
        expect(navigationPolicy('http://localhost.evil.dev/', DEV_ORIGIN)).toBe('block');
    });

    it('blocks a scheme that reads the machine or runs code', () => {
        expect(navigationPolicy('file:///etc/passwd', DEV_ORIGIN)).toBe('block');
        expect(navigationPolicy('javascript:alert(1)', DEV_ORIGIN)).toBe('block');
    });

    it('allows only the exact packaged renderer file', () => {
        const entry = 'file:///app.asar/out/renderer/index.html';

        expect(navigationPolicy(entry, entry)).toBe('allow');
        expect(navigationPolicy('file:///etc/passwd', entry)).toBe('block');
        expect(navigationPolicy('file:///app.asar/out/renderer/other.html', entry)).toBe('block');
    });

    it('blocks what is not a url at all', () => {
        expect(navigationPolicy('not a url', DEV_ORIGIN)).toBe('block');
    });
});
