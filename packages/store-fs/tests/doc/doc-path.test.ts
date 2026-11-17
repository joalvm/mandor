import { join } from 'node:path';

import { IdError } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { docRepoPath } from '../../src/index.js';

const ROOT = join('C:', 'repos', 'mi-repo');
const WORKSPACE = 'eventos-de-pagos';

describe('naming a doc the way git names it', () => {
    /** Git is asked about a file by the path the history has, not the one the machine has. */
    it('gives the path from the root with forward slashes', () => {
        expect(docRepoPath(ROOT, WORKSPACE, 'notas.md')).toBe(
            'workspaces/eventos-de-pagos/docs/notas.md',
        );
    });

    it('refuses a name that climbs out of the docs folder', () => {
        expect(() => docRepoPath(ROOT, WORKSPACE, '../mandor.yaml')).toThrow(IdError);
    });
});
