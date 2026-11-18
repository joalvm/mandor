import { degradation, type Degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { pickableIds } from '../../src/choice/lib/choice-state.js';
import {
    chosenOf,
    importChoiceNodes,
    selectionSummary,
    withChosen,
} from '../../src/import/lib/import-plan-tree.js';
import { entryOf, leftOutEntry, planOf } from '../support/plan-entries.js';

const WORDS = {
    conflict: 'something else holds this name',
    removal: 'the document no longer carries it',
    loss: ({ code }: Degradation) => `said ${code}`,
};

const SAMPLE = planOf([
    entryOf('connection', 'produccion'),
    entryOf('folder', 'pedidos'),
    entryOf('item', 'pedidos/registrar'),
    entryOf('item', 'pedidos/avisar'),
]);

describe('what the format could not carry whole', () => {
    const NOTED = planOf([
        entryOf('folder', 'pedidos', [degradation('folderKeepsNoDescription')]),
        entryOf('item', 'pedidos/registrar', [
            degradation('scriptDisabled'),
            degradation('pkceAlways'),
        ]),
        entryOf('item', 'pedidos/avisar'),
    ]);

    it('is a note on its row, and the row stays open to the choice', () => {
        const [folder] = importChoiceNodes(NOTED, WORDS);

        expect(folder?.reason).toBeUndefined();
        expect(folder?.note).toBe('said folderKeepsNoDescription');
        expect(folder?.children.map((child) => child.reason)).toEqual([undefined, undefined]);
        expect(folder?.children.map((child) => child.note)).toEqual([
            'said scriptDisabled · said pkceAlways',
            undefined,
        ]);
    });

    it('lets the whole branch be chosen, notes and all', () => {
        const nodes = importChoiceNodes(NOTED, WORDS);

        expect(nodes.flatMap(pickableIds)).toEqual(['1', '2']);
    });
});

describe('what an import plan has chosen', () => {
    it('is the leaves it marks, and not the barred ones or the unmarked', () => {
        const plan = planOf([
            leftOutEntry('colas'),
            entryOf('folder', 'pedidos'),
            { ...entryOf('item', 'pedidos/registrar'), selected: false },
            entryOf('item', 'pedidos/avisar', [degradation('scriptDisabled')]),
        ]);

        expect(chosenOf(plan, importChoiceNodes(plan, WORDS))).toEqual(new Set(['3']));
    });
});

describe('a plan with something chosen', () => {
    it('marks the leaves that were chosen, and puts a branch in with anything below it', () => {
        const plan = withChosen(SAMPLE, importChoiceNodes(SAMPLE, WORDS), new Set(['2']));

        expect(plan.entries.map((entry) => entry.selected)).toEqual([false, true, true, false]);
    });

    it('takes a branch out when nothing below it is left', () => {
        const plan = withChosen(SAMPLE, importChoiceNodes(SAMPLE, WORDS), new Set(['0']));

        expect(plan.entries.map((entry) => entry.selected)).toEqual([true, false, false, false]);
    });

    it('marks and clears a row with a note like any other', () => {
        const noted = planOf([entryOf('connection', 'colas', [degradation('noServer')])]);
        const nodes = importChoiceNodes(noted, WORDS);

        expect(withChosen(noted, nodes, new Set()).entries[0]?.selected).toBe(false);
        expect(withChosen(noted, nodes, new Set(['0'])).entries[0]?.selected).toBe(true);
    });

    it('leaves the rows nobody can choose as they were', () => {
        const plan = planOf([leftOutEntry('colas')]);

        expect(
            withChosen(plan, importChoiceNodes(plan, WORDS), new Set(['0'])).entries[0]?.selected,
        ).toBe(false);
    });

    it('is a new plan and leaves the old one alone', () => {
        const plan = withChosen(SAMPLE, importChoiceNodes(SAMPLE, WORDS), new Set());

        expect(plan).not.toBe(SAMPLE);
        expect(SAMPLE.entries.every((entry) => entry.selected)).toBe(true);
    });
});

describe('selectionSummary', () => {
    it('counts the rows marked out of the rows the document carries', () => {
        const plan = withChosen(SAMPLE, importChoiceNodes(SAMPLE, WORDS), new Set(['0']));

        expect(selectionSummary(plan)).toEqual({ selected: 1, total: 4 });
    });
});
