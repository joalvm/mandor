import { isAbsolute, join, relative, resolve } from 'node:path';

import { IdError } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { workspaceDir, workspaceFile } from '../../src/index.js';

const root = resolve('mandor-repo');

/** A path escapes the root as soon as walking back to it needs `..` or an absolute jump. */
function isInside(target: string): boolean {
    const step = relative(root, target);

    return step !== '' && !step.startsWith('..') && !isAbsolute(step);
}

describe('workspace paths', () => {
    it('puts a workspace under the workspaces container', () => {
        expect(workspaceDir(root, 'api-pagos')).toBe(join(root, 'workspaces', 'api-pagos'));
    });

    it('names the workspace file inside its own directory', () => {
        expect(workspaceFile(root, 'api-pagos')).toBe(
            join(root, 'workspaces', 'api-pagos', 'workspace.yaml'),
        );
    });

    /** The gate the whole package rests on: an id is validated before it reaches `join`. */
    it('rejects a workspace id that climbs out of the root', () => {
        expect(() => workspaceFile(root, '../../etc')).toThrow(IdError);
    });

    it.each(['..', 'a/b', '', '.git', 'Api', 'con'])('rejects the workspace id "%s"', (id) => {
        expect(() => workspaceDir(root, id)).toThrow(IdError);
    });

    it.each(['api-pagos', 'eventos-pagos', 'a1'])('keeps "%s" inside the root', (id) => {
        expect(isInside(workspaceDir(root, id))).toBe(true);
        expect(isInside(workspaceFile(root, id))).toBe(true);
    });
});
