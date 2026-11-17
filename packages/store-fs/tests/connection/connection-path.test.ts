import { isAbsolute, join, relative, resolve } from 'node:path';

import { IdError } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { connectionFile } from '../../src/index.js';

const root = resolve('mandor-repo');

/** A path escapes the root as soon as walking back to it needs `..` or an absolute jump. */
function isInside(target: string): boolean {
    const step = relative(root, target);

    return step !== '' && !step.startsWith('..') && !isAbsolute(step);
}

describe('connection paths', () => {
    it('names the connection file inside the connections folder of its workspace', () => {
        expect(connectionFile(root, 'eventos-pagos', 'gateway-local')).toBe(
            join(root, 'workspaces', 'eventos-pagos', 'connections', 'gateway-local.yaml'),
        );
    });

    it('rejects a connection id that climbs out of the workspace', () => {
        expect(() => connectionFile(root, 'eventos-pagos', '../../etc')).toThrow(IdError);
    });

    it('rejects a workspace id that climbs out of the root', () => {
        expect(() => connectionFile(root, '..', 'gateway-local')).toThrow(IdError);
    });

    it('keeps the connection file inside the root', () => {
        expect(isInside(connectionFile(root, 'eventos-pagos', 'gateway-local'))).toBe(true);
    });
});
