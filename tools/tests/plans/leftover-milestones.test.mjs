import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { leftoverMilestones } from '../../plans/plan-state.mjs';

const TABLE = [
    '| Hito | Qué | Estado |',
    '| ---- | --- | ------ |',
    '| H4   | Git | hecho  |',
    '| [H5](hito-5/README.md) | Sync | abierto |',
].join('\n');

const roots = [];

function repoWith(folders, table = TABLE) {
    const root = mkdtempSync(join(tmpdir(), 'mandor-plans-'));

    roots.push(root);
    mkdirSync(join(root, 'docs/plans'), { recursive: true });
    writeFileSync(join(root, 'docs/plans/README.md'), `${table}\n`);

    for (const folder of folders) {
        mkdirSync(join(root, 'docs/plans', folder));
    }

    return root;
}

afterEach(() => {
    for (const root of roots.splice(0)) {
        rmSync(root, { recursive: true, force: true });
    }
});

/**
 * A closed milestone leaves no folder behind: its plans were read to the end. A folder that
 * survives is either a milestone somebody forgot to close or one somebody reopened by accident,
 * and either way the table no longer tells the whole truth. The plans live outside the repo, so a
 * fresh clone has none, and that is not a problem to report.
 */
describe('leftoverMilestones', () => {
    it('finds nothing when only the open milestone has a folder', () => {
        expect(leftoverMilestones(repoWith(['hito-5']))).toEqual([]);
    });

    it('names every milestone folder that is not the open one', () => {
        expect(leftoverMilestones(repoWith(['hito-3', 'hito-4', 'hito-5']))).toEqual([
            'hito-3',
            'hito-4',
        ]);
    });

    it('leaves alone folders that are not milestones', () => {
        expect(leftoverMilestones(repoWith(['hito-5', 'assets']))).toEqual([]);
    });

    it('finds nothing in a checkout that carries no plans', () => {
        const root = mkdtempSync(join(tmpdir(), 'mandor-plans-'));

        roots.push(root);

        expect(leftoverMilestones(root)).toEqual([]);
    });

    it('reads a milestone of two digits as the open one', () => {
        const ten = TABLE.replace('[H5](hito-5/README.md)', '[H10](hito-10/README.md)');

        expect(leftoverMilestones(repoWith(['hito-10', 'hito-1'], ten))).toEqual(['hito-1']);
    });

    it('names every milestone folder when no milestone is open', () => {
        const closed = TABLE.replace('abierto', 'hecho');

        expect(leftoverMilestones(repoWith(['hito-5'], closed))).toEqual(['hito-5']);
    });

    it('keeps the folder of a milestone whose plans were written ahead', () => {
        const ahead = `${TABLE}\n| H6   | CLI | pendiente |`;

        expect(leftoverMilestones(repoWith(['hito-5', 'hito-6', 'hito-7'], ahead))).toEqual([
            'hito-7',
        ]);
    });
});
