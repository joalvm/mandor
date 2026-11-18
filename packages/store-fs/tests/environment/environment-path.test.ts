import { isAbsolute, join, relative, resolve } from 'node:path';

import { IdError } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { environmentFile } from '../../src/index.js';
import { environmentsDir } from '../../src/environment/environment-path.js';

const root = resolve('mandor-repo');

/** A path escapes the root as soon as walking back to it needs `..` or an absolute jump. */
function isInside(target: string): boolean {
    const step = relative(root, target);

    return step !== '' && !step.startsWith('..') && !isAbsolute(step);
}

describe('environment paths', () => {
    it('names the environment file inside the environments folder of its workspace', () => {
        expect(environmentFile(root, 'eventos-pagos', 'local')).toBe(
            join(root, 'workspaces', 'eventos-pagos', 'environments', 'local.yaml'),
        );
    });

    it('places the environments folder inside the workspace', () => {
        expect(environmentsDir(root, 'eventos-pagos')).toBe(
            join(root, 'workspaces', 'eventos-pagos', 'environments'),
        );
    });

    it('rejects an environment id that climbs out of the workspace', () => {
        expect(() => environmentFile(root, 'eventos-pagos', '../../etc')).toThrow(IdError);
    });

    it('rejects a workspace id that climbs out of the root', () => {
        expect(() => environmentFile(root, '..', 'local')).toThrow(IdError);
    });

    it('keeps the environment file inside the root', () => {
        expect(isInside(environmentFile(root, 'eventos-pagos', 'local'))).toBe(true);
    });
});
