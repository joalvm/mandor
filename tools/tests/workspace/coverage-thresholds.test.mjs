import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { packageThresholds } from '../../workspace/coverage-thresholds.mjs';

const FULL = { statements: 100, branches: 100, functions: 100, lines: 100 };
const FLOOR = { statements: 90, branches: 80, functions: 90, lines: 90 };

let root;

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'mandor-thresholds-'));
    mkdirSync(join(root, 'packages', 'demo', 'src', 'alpha'), { recursive: true });
    mkdirSync(join(root, 'packages', 'demo', 'src', 'beta'), { recursive: true });
    writeFileSync(join(root, 'packages', 'demo', 'src', 'index.ts'), '');
});

afterEach(() => {
    rmSync(root, { recursive: true, force: true });
});

describe('the coverage gate of a pure package (packageThresholds)', () => {
    it('holds the whole package to the full gate when nothing gives it a floor', () => {
        expect(packageThresholds(root, 'demo', {}, FULL)).toEqual([['packages/demo/**', FULL]]);
    });

    it('holds the whole package to the floor it declares', () => {
        const below = { demo: { floor: FLOOR } };

        expect(packageThresholds(root, 'demo', below, FULL)).toEqual([['packages/demo/**', FLOOR]]);
    });

    it('writes the package entry by entry when one folder of it has a floor', () => {
        const below = { 'demo/src/alpha': { floor: FLOOR } };

        expect(packageThresholds(root, 'demo', below, FULL)).toEqual([
            ['packages/demo/src/beta/**', FULL],
            ['packages/demo/src/index.ts', FULL],
            ['packages/demo/src/alpha/**', FLOOR],
        ]);
    });
});
