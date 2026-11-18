import { describe, expect, it } from 'vitest';

import { FolderImportTakenError } from '../../src/import/folder-import-taken-error.js';

describe('the error of a folder an import may not overwrite', () => {
    it('names the route and says the folder was set by hand', () => {
        const error = new FolderImportTakenError('users/admin');

        expect(error.route).toBe('users/admin');
        expect(error.name).toBe('FolderImportTakenError');
        expect(error.message).toContain('users/admin');
        expect(error).toBeInstanceOf(Error);
    });
});
