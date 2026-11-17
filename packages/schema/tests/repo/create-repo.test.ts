import { describe, expect, it } from 'vitest';

import { createRepo, FormatError, parseRepo, REPO_FORMAT } from '../../src/index.js';

describe('createRepo', () => {
    it('returns a repo that passes its own parse', () => {
        const repo = createRepo({ name: 'Personal' });

        expect(parseRepo(repo)).toEqual(repo);
        expect(repo.formatVersion).toBe(REPO_FORMAT);
        expect(repo.workspaces).toEqual([]);
    });

    it('rejects a name containing only whitespace', () => {
        expect(() => createRepo({ name: '   ' })).toThrow(FormatError);
    });

    it('does not retain the mutable workspace order passed by the caller', () => {
        const workspaces = ['api-pagos'];
        const repo = createRepo({ name: 'Personal', workspaces });

        workspaces.push('eventos');

        expect(repo.workspaces).toEqual(['api-pagos']);
    });
});
