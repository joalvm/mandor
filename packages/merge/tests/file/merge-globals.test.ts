import { describe, expect, it } from 'vitest';

import { mergeFile } from '../../src/index.js';

function row(name: string, value: string): string {
    return `  - name: ${name}\n    value: ${value}\n    enabled: true\n    secret: false\n`;
}

describe('merging the globals of an origin edited on two machines', () => {
    it('keeps the variable each machine added, row by row, without a conflict', () => {
        const base = `variables:\n${row('host', 'api.local')}`;
        const merged = mergeFile({
            path: 'globals.yaml',
            base,
            ours: `${base}${row('token', 'a')}`,
            theirs: `${base}${row('region', 'eu')}`,
        });

        expect(merged.conflicts).toEqual([]);
        expect(merged.text).toContain('name: token');
        expect(merged.text).toContain('name: region');
        expect(merged.text).toContain('name: host');
    });

    it('names a conflict when both machines changed the value of the same variable', () => {
        const base = `variables:\n${row('host', 'api.local')}`;
        const merged = mergeFile({
            path: 'globals.yaml',
            base,
            ours: `variables:\n${row('host', 'uno')}`,
            theirs: `variables:\n${row('host', 'dos')}`,
        });

        expect(merged.conflicts).toHaveLength(1);
    });
});
