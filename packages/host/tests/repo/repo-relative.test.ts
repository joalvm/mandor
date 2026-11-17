import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { repoRelative } from '../../src/repo/repo-relative.js';

describe('spelling a path of the repo the way git does', () => {
    it('drops the root and keeps the rest', () => {
        const root = join('some', 'repo');

        expect(repoRelative(root, join(root, 'workspaces', 'api', 'workspace.yaml'))).toBe(
            'workspaces/api/workspace.yaml',
        );
    });

    it('uses forward slashes whatever the machine uses', () => {
        expect(repoRelative('repo', join('repo', 'a', 'b.yaml'))).toBe('a/b.yaml');
    });

    it('answers with the empty path for the root itself', () => {
        expect(repoRelative('repo', 'repo')).toBe('');
    });
});
