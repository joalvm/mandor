import { describe, expect, it } from 'vitest';

import { REPO_FORMAT } from '../../src/repo/repo-format.js';
import { repoSchema } from '../../src/repo/repo-schema.js';

const REPO = { formatVersion: REPO_FORMAT, name: 'Personal', workspaces: ['pagos', 'eventos'] };

describe('repoSchema', () => {
    it('reads a repo with its workspaces in display order', () => {
        expect(repoSchema.parse(REPO)).toEqual(REPO);
    });

    it('reads a repo of an older format, which this build can still open', () => {
        expect(repoSchema.safeParse({ ...REPO, formatVersion: 1 }).success).toBe(true);
    });

    it('refuses a format newer than this build writes', () => {
        expect(repoSchema.safeParse({ ...REPO, formatVersion: REPO_FORMAT + 1 }).success).toBe(
            false,
        );
    });

    it('refuses a format that is zero, fractional or not a number', () => {
        expect(repoSchema.safeParse({ ...REPO, formatVersion: 0 }).success).toBe(false);
        expect(repoSchema.safeParse({ ...REPO, formatVersion: 1.5 }).success).toBe(false);
        expect(repoSchema.safeParse({ ...REPO, formatVersion: '1' }).success).toBe(false);
    });

    it('refuses a name made of whitespace only', () => {
        expect(repoSchema.safeParse({ ...REPO, name: '  ' }).success).toBe(false);
    });

    it('refuses a workspace that is not an id', () => {
        expect(repoSchema.safeParse({ ...REPO, workspaces: ['../pagos'] }).success).toBe(false);
    });

    it('points at the second appearance of a workspace id in the order', () => {
        const result = repoSchema.safeParse({ ...REPO, workspaces: ['pagos', 'eventos', 'pagos'] });

        expect(result.success ? [] : result.error.issues).toMatchObject([
            {
                path: ['workspaces', 2],
                message: 'Workspace id appears more than once in display order',
            },
        ]);
    });
});
