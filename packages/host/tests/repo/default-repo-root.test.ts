import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { defaultRepoRoot } from '../../src/repo/default-repo-root.js';

vi.mock('electron', () => ({
    app: { getPath: () => join('C:', 'Users', 'someone', 'Documents') },
}));

afterEach(() => {
    delete process.env['MANDOR_DEFAULT_REPO_ROOT'];
});

describe('where the repo the app opens by itself lives', () => {
    it('sits under the documents folder, one repo per app, in the folder it is given', () => {
        expect(defaultRepoRoot('realtime')).toBe(
            join('C:', 'Users', 'someone', 'Documents', 'Mandor', 'realtime', 'local'),
        );
        expect(defaultRepoRoot('request')).toBe(
            join('C:', 'Users', 'someone', 'Documents', 'Mandor', 'request', 'local'),
        );
    });

    /**
     * An end-to-end run needs a sandbox, and the documents folder of the machine is not one.
     * The variable names the container: each app still puts its own segment under it, so two
     * apps pointed at the same sandbox never open the same repo.
     */
    it('moves the container to the folder the environment names', () => {
        process.env['MANDOR_DEFAULT_REPO_ROOT'] = join('C:', 'sandbox', 'Mandor');

        expect(defaultRepoRoot('realtime')).toBe(
            join('C:', 'sandbox', 'Mandor', 'realtime', 'local'),
        );
    });

    /** A shell that exports the name with no value must not send the repo to the disk root. */
    it('ignores the name exported with no value', () => {
        process.env['MANDOR_DEFAULT_REPO_ROOT'] = '';

        expect(defaultRepoRoot('realtime')).toBe(
            join('C:', 'Users', 'someone', 'Documents', 'Mandor', 'realtime', 'local'),
        );
    });
});
