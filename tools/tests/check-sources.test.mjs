import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { sourcesIn } from '../check-sources.mjs';

describe('the files a list of paths stands for', () => {
    let root = '';

    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), 'check-sources-')).replaceAll('\\', '/');
        mkdirSync(join(root, 'src/deep/node_modules'), { recursive: true });
        writeFileSync(join(root, 'src/a.ts'), '');
        writeFileSync(join(root, 'src/deep/b.tsx'), '');
        writeFileSync(join(root, 'src/deep/c.json'), '');
        writeFileSync(join(root, 'src/deep/node_modules/d.ts'), '');
    });

    afterEach(() => {
        rmSync(root, { force: true, recursive: true });
    });

    it('opens a folder into the sources under it', () => {
        expect(sourcesIn([`${root}/src`])).toEqual([`${root}/src/a.ts`, `${root}/src/deep/b.tsx`]);
    });

    it('keeps a file named by hand, whatever it is', () => {
        expect(sourcesIn([`${root}/src/deep/c.json`])).toEqual([`${root}/src/deep/c.json`]);
    });

    it('keeps a path that is no longer there: it can still have tests', () => {
        expect(sourcesIn([`${root}/gone.ts`])).toEqual([`${root}/gone.ts`]);
    });
});
