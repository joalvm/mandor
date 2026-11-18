import { describe, expect, it } from 'vitest';

import { aboutReport } from '../src/lib/about-report.js';

describe('the report the about section copies', () => {
    it('names the app, its version, the runtimes under it and the system', () => {
        expect(
            aboutReport({
                chrome: '130.0.1',
                electron: '33.2.0',
                name: 'Mandor Realtime',
                node: '22.9.0',
                platform: 'win32',
                version: '0.1.0',
            }),
        ).toBe(
            [
                'Mandor Realtime 0.1.0',
                'Electron 33.2.0 · Chromium 130.0.1 · Node 22.9.0',
                'Platform win32',
            ].join('\n'),
        );
    });
});
