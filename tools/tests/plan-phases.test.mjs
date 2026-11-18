import { describe, expect, it } from 'vitest';

import { phasesOf } from '../plans/plan-phases.mjs';
import { realState } from '../plans/plan-state.mjs';

const PLAN = `## Plan

### [x] Fase 1 · algo

Prosa.

\`\`\`check
file packages/ui/src/index.ts
# una nota
\`\`\`

### [ ] Fase 2 · otra cosa

Prosa sin bloque.
`;

describe('reading a plan', () => {
    it('separates a ticked phase from one still open', () => {
        expect(phasesOf(PLAN).map((phase) => phase.done)).toEqual([true, false]);
    });

    it('keeps the checks of a phase and throws away the notes', () => {
        expect(phasesOf(PLAN)[0].checks).toEqual(['file packages/ui/src/index.ts']);
    });

    // A phase with no block and one with an empty block are two different mistakes: the first
    // forgot to say what it delivers, the second says it delivers nothing.
    it('tells a phase with no block apart from one with an empty one', () => {
        expect(phasesOf(PLAN)[1].checks).toBeUndefined();
        expect(phasesOf('### [ ] Fase 1\n\n```check\n```\n')[0].checks).toEqual([]);
    });
});

describe('the state the ticks describe', () => {
    it('is pendiente when nothing is ticked', () => {
        expect(realState([{ done: false }, { done: false }])).toBe('pendiente');
    });

    it('is en curso while one phase is left', () => {
        expect(realState([{ done: true }, { done: false }])).toBe('en curso');
    });

    it('is hecho only when every phase is ticked', () => {
        expect(realState([{ done: true }, { done: true }])).toBe('hecho');
    });
});
