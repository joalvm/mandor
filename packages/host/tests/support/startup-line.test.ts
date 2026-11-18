import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readStartup } from './startup-line.js';

let dir: string;

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mandor-startup-line-'));
});

afterEach(async () => {
    await rm(dir, { force: true, recursive: true });
});

describe('the start the log tells about', () => {
    it('is nothing while there is no log or no start in it', async () => {
        expect(await readStartup(dir)).toBeUndefined();

        await writeFile(join(dir, 'mandor.log'), '2026-10-08T10:00:00.000Z info other line\n');

        expect(await readStartup(dir)).toBeUndefined();
    });

    it('reads the last start, and skips the reload that came after it', async () => {
        const lines = [
            '2026-10-08T10:00:00.000Z info startup host-start=10 app-ready=200 window-ready=900',
            '2026-10-08T10:05:00.000Z info startup host-start=11 app-ready=210 window-ready=950',
            '2026-10-08T10:06:00.000Z info startup window-reloaded=1200',
        ];

        await writeFile(join(dir, 'mandor.log'), `${lines.join('\n')}\n`);

        expect(await readStartup(dir)).toEqual({
            'app-ready': 210,
            'host-start': 11,
            'window-ready': 950,
        });
    });
});
