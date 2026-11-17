import { describe, expect, it } from 'vitest';

import { REPO_FORMAT, type Repo } from '../../src/index.js';

describe('Repo', () => {
    it('is a plain data shape with the workspace display order', () => {
        const repo: Repo = { formatVersion: REPO_FORMAT, name: 'Personal', workspaces: [] };

        expect(repo.workspaces).toHaveLength(0);
    });
});
