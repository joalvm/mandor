import { describe, expect, it } from 'vitest';

import { parsePostmanDocument } from '../../../src/postman/document/parse-postman-document.js';
import { globalsFileOf } from '../../../src/postman/export/globals-file.js';
import { SECRET_VALUE, SYNC_WORKSPACE } from '../support/sample-workspace.js';

describe('globals-file: the variables of the workspace as the globals of Postman', () => {
    it('lists the variables as the rows of an environment, marked as globals', () => {
        expect(globalsFileOf(SYNC_WORKSPACE.globals)).toEqual({
            id: 'globals',
            name: 'Globals',
            values: [{ key: 'region', value: 'eu', type: 'default', enabled: true }],
            _postman_variable_scope: 'globals',
        });
    });

    it('lets the value of a secret out nowhere and keeps a switched off variable off', () => {
        const file = globalsFileOf([
            { name: 'key', value: SECRET_VALUE, enabled: false, secret: true },
        ]);

        expect(file['values']).toEqual([{ key: 'key', value: '', type: 'secret', enabled: false }]);
        expect(JSON.stringify(file)).not.toContain(SECRET_VALUE);
    });

    it('is read back as the globals it was, not as an environment', () => {
        const document = parsePostmanDocument(
            JSON.stringify(globalsFileOf(SYNC_WORKSPACE.globals)),
        );

        expect(document.kind).toBe('globals');
    });
});
