import { describe, expect, it } from 'vitest';

import {
    appAboutRequestSchema,
    appAboutResultSchema,
    appAboutSchema,
} from '../../src/app/app-about.js';

const ABOUT = {
    chrome: '140.0.0.0',
    electron: '40.0.0',
    name: 'Mandor Realtime',
    node: '24.0.0',
    platform: 'win32',
    version: '0.1.0',
};

describe('the answer to who the app is', () => {
    it('carries the name, the version, the runtimes and the system', () => {
        expect(appAboutSchema.parse(ABOUT)).toEqual(ABOUT);
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
