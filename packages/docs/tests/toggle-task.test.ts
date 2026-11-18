import { describe, expect, it } from 'vitest';

import { toggledTask } from '../src/lib/toggle-task.js';

describe('ticking a task of a doc', () => {
    it('ticks a box that was empty and empties one that was ticked', () => {
        expect(toggledTask('- [ ] Probar\n', 0)).toBe('- [x] Probar\n');
        expect(toggledTask('- [x] Probar\n', 0)).toBe('- [ ] Probar\n');
        expect(toggledTask('- [X] Probar\n', 0)).toBe('- [ ] Probar\n');
    });

    /** The page counts the boxes it draws, so the text has to count the same ones. */
    it('counts the tasks in the order the page draws them', () => {
        const doc = '- [ ] Uno\n- [ ] Dos\n- [ ] Tres\n';

        expect(toggledTask(doc, 1)).toBe('- [ ] Uno\n- [x] Dos\n- [ ] Tres\n');
    });

    it('finds tasks under any bullet, in a numbered list and in a quote', () => {
        const doc = '* [ ] Uno\n+ [ ] Dos\n1. [ ] Tres\n2) [ ] Cuatro\n> - [ ] Cinco\n';

        expect(toggledTask(doc, 4)).toBe(
            '* [ ] Uno\n+ [ ] Dos\n1. [ ] Tres\n2) [ ] Cuatro\n> - [x] Cinco\n',
        );
        expect(toggledTask(doc, 3)).toContain('2) [x] Cuatro');
    });

    /** A list written inside a block of code is code: the page draws no box for it. */
    it('skips the lines of a fenced block', () => {
        const doc = '```md\n- [ ] Ejemplo\n```\n\n~~~\n- [ ] Otro\n~~~\n\n- [ ] Real\n';

        expect(toggledTask(doc, 0)).toBe(
            '```md\n- [ ] Ejemplo\n```\n\n~~~\n- [ ] Otro\n~~~\n\n- [x] Real\n',
        );
    });

    it('leaves alone a line that only looks like a task, and a task that is not there', () => {
        const doc = '-[ ] pegado\n- [ ]sin espacio\n- [ ] Uno\n';

        expect(toggledTask(doc, 0)).toBe('-[ ] pegado\n- [ ]sin espacio\n- [x] Uno\n');
        expect(toggledTask(doc, 5)).toBe(doc);
    });
});
