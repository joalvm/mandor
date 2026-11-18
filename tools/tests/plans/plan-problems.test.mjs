import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { planProblems } from '../../plans/plan-problems.mjs';

/** A finished plan whose one claim the tree no longer holds. */
const FINISHED = '### [x] Fase 1 · algo\n\n```check\nfile packages/nowhere/src/index.ts\n```\n';

/** The same plan with a phase still open after it. */
const UNFINISHED = `${FINISHED}\n### [ ] Fase 2 · otra cosa\n\n\`\`\`check\n\`\`\`\n`;

let folder = '';

beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'mandor-plans-'));
    await writeFile(join(folder, '01-terminado.md'), FINISHED);
    await writeFile(join(folder, '02-a-medias.md'), UNFINISHED);
});

afterEach(async () => {
    await rm(folder, { force: true, recursive: true });
});

describe('the claims of a plan', () => {
    it('holds a finished plan to what its ticks claim', () => {
        expect(planProblems(folder, '01-terminado.md', 'hecho')).toEqual([
            expect.stringContaining('is not there'),
        ]);
    });

    /** A later decision replaced what it delivered, and the tree holds the replacement on purpose. */
    it('leaves alone the claims of a plan the table marks as replaced', () => {
        expect(planProblems(folder, '01-terminado.md', 'sustituido')).toEqual([]);
    });

    it('takes as replaced only a plan that was finished', () => {
        expect(planProblems(folder, '02-a-medias.md', 'sustituido')).toEqual([
            expect.stringContaining('only a finished plan is replaced'),
        ]);
    });
});
