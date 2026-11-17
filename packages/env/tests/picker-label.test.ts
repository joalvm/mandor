import { createEnvironment } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { pickerLabel } from '../src/lib/picker-label.js';

const LOCAL = createEnvironment({ id: 'local', name: 'Local' });
const BASE = createEnvironment({ id: 'base', name: 'Base' });

function asDefault(name: string): string {
    return `${name} (default)`;
}

describe('pickerLabel', () => {
    it('names the chosen one, then the default as such, then none', () => {
        expect(pickerLabel(LOCAL, BASE, asDefault, 'None')).toBe('Local');
        expect(pickerLabel(undefined, BASE, asDefault, 'None')).toBe('Base (default)');
        expect(pickerLabel(undefined, undefined, asDefault, 'None')).toBe('None');
    });
});
