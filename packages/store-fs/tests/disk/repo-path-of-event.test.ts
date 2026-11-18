import { describe, expect, it } from 'vitest';

import { repoPathOfEvent } from '../../src/disk/repo-path-of-event.js';

describe('a path named by the watcher, spelled as the repo spells it (repo-path-of-event)', () => {
    it('turns the separator of Windows into the one of the repo', () => {
        expect(repoPathOfEvent('workspaces\\pagos\\workspace.yaml', '\\')).toBe(
            'workspaces/pagos/workspace.yaml',
        );
    });

    it('leaves alone a path already spelled with the separator of the repo', () => {
        expect(repoPathOfEvent('workspaces/pagos/workspace.yaml', '/')).toBe(
            'workspaces/pagos/workspace.yaml',
        );
    });
});
