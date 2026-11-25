import { describe, expect, it } from 'vitest';

import {
    appAboutRequestSchema,
    appAboutResultSchema,
    appAboutSchema,
} from '../../src/app/app-about.js';

const ABOUT = {
    arch: 'x64',
    chrome: '140.0.0.0',
    electron: '40.0.0',
    icon: 'data:image/png;base64,iVBORw0KGgo=',
    name: 'Mandor Realtime',
    node: '24.0.0',
    platform: 'win32',
    system: '10.0.26100',
    version: '0.1.0',
};

describe('the answer to who the app is', () => {
    it('carries the name, the version, the runtimes and the system', () => {
        expect(appAboutSchema.parse(ABOUT)).toEqual(ABOUT);
    });

    /** The icon is drawn as it comes: an address to anywhere else would be a request out. */
    it('takes an icon only as an image it carries, or none', () => {
        expect(appAboutSchema.safeParse({ ...ABOUT, icon: '' }).success).toBe(true);
        expect(
            appAboutSchema.safeParse({ ...ABOUT, icon: 'https://example.com/icon.png' }).success,
        ).toBe(false);
    });

    it('refuses an answer that leaves a runtime empty', () => {
        expect(appAboutSchema.safeParse({ ...ABOUT, chrome: '' }).success).toBe(false);
    });

    it('refuses an answer that carries more than it promises', () => {
        expect(appAboutSchema.safeParse({ ...ABOUT, path: 'C:/Mandor' }).success).toBe(false);
    });

    it('reads as a wire answer, success or refusal', () => {
        expect(appAboutResultSchema.safeParse({ ok: true, value: ABOUT }).success).toBe(true);
        expect(
            appAboutResultSchema.safeParse({ ok: false, error: { code: 'unknown', message: 'x' } })
                .success,
        ).toBe(true);
    });

    it('is asked with nothing', () => {
        expect(appAboutRequestSchema.safeParse({}).success).toBe(true);
        expect(appAboutRequestSchema.safeParse({ name: 'x' }).success).toBe(false);
    });
});
