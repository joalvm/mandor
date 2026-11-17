import { describe, expect, it } from 'vitest';

import { folderSettingsDocumentOf } from '../../../src/postman/export/folder-settings-document.js';

describe('folderSettingsDocumentOf', () => {
    it('writes no key for a level that declares nothing', () => {
        expect(folderSettingsDocumentOf({ variables: [], headers: [] })).toEqual({});
    });

    it('writes the description, the variables and the auth a level declares', () => {
        expect(
            folderSettingsDocumentOf({
                description: 'Lo suyo',
                variables: [{ name: 'zona', value: 'eu', enabled: true, secret: false }],
                auth: { type: 'none' },
                headers: [],
            }),
        ).toEqual({
            description: 'Lo suyo',
            variable: [{ key: 'zona', value: 'eu', type: 'string' }],
            auth: { type: 'noauth' },
        });
    });

    it('marks a variable that is switched off as Postman does', () => {
        const { variable } = folderSettingsDocumentOf({
            variables: [{ name: 'a', value: '1', enabled: false, secret: false }],
            headers: [],
        });

        expect(variable).toEqual([{ key: 'a', value: '1', type: 'string', disabled: true }]);
    });

    it('leaves the headers to the requests: Postman has none at a level', () => {
        expect(
            folderSettingsDocumentOf({
                variables: [],
                headers: [{ key: 'X-A', value: '1', enabled: true }],
            }),
        ).toEqual({});
    });

    it('writes the scripts of a level as its events', () => {
        const document = folderSettingsDocumentOf({
            variables: [],
            headers: [],
            importedScripts: [{ event: 'onResponse', dialect: 'postman', source: 'a();' }],
        });

        expect(document['event']).toEqual([
            { listen: 'test', script: { type: 'text/javascript', exec: ['a();'] } },
        ]);
    });
});
