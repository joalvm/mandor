import { describe, expect, it } from 'vitest';

import { enterInList } from '../../src/editor/markdown-list.js';

/** The column after the last character of a line, where the caret stands once it is typed. */
function end(line: string): number {
    return line.length + 1;
}

describe('pressing Enter in a list of markdown', () => {
    it('repeats the bullet of the item, with its indent and its spacing', () => {
        expect(enterInList('- one', end('- one'))).toBe('\n- ');
        expect(enterInList('  * two', end('  * two'))).toBe('\n  * ');
        expect(enterInList('+   three', end('+   three'))).toBe('\n+   ');
    });

    it('counts a numbered list up, closing the number the way the item does', () => {
        expect(enterInList('1. one', end('1. one'))).toBe('\n2. ');
        expect(enterInList('9) nine', end('9) nine'))).toBe('\n10) ');
    });

    /** A ticked task is done: the next one is still to do. */
    it('brings a task back unticked', () => {
        expect(enterInList('- [x] shipped', end('- [x] shipped'))).toBe('\n- [ ] ');
        expect(enterInList('1. [ ] first', end('1. [ ] first'))).toBe('\n2. [ ] ');
    });

    it('ends the list on an item with nothing in it', () => {
        expect(enterInList('- ', end('- '))).toBeNull();
        expect(enterInList('2. [ ] ', end('2. [ ] '))).toBeNull();
    });

    it('breaks the line anywhere outside a list, and before the bullet of one', () => {
        expect(enterInList('plain text', end('plain text'))).toBe('\n');
        expect(enterInList('  - one', 2)).toBe('\n');
    });
});
