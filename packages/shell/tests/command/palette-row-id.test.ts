import { describe, expect, it } from 'vitest';

import { paletteRowId } from '../../src/command/palette-row-id.js';

describe('the id of a row of the palette', () => {
    it('is told apart by the list and by the command', () => {
        expect(paletteRowId('list-1', 'tab.close')).toBe('list-1-tab.close');
        expect(paletteRowId('list-2', 'tab.close')).not.toBe(paletteRowId('list-1', 'tab.close'));
        expect(paletteRowId('list-1', 'tab.moveAside')).not.toBe(
            paletteRowId('list-1', 'tab.close'),
        );
    });
});
