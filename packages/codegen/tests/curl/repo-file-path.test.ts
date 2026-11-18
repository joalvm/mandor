import { describe, expect, it } from 'vitest';

import { isRepoFilePath } from '../../src/curl/repo-file-path.js';

describe('the file a curl body may name', () => {
    it.each(['body.json', 'docs/a.pdf'])('accepts %s, inside the repo', (path) => {
        expect(isRepoFilePath(path)).toBe(true);
    });

    it.each(['-', '/etc/hosts', 'C:/x', '../x', 'a\\b', ''])('refuses %j', (path) => {
        expect(isRepoFilePath(path)).toBe(false);
    });
});
