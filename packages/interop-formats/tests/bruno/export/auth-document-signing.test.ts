import { describe, expect, it } from 'vitest';

import { authDocumentOf } from '../../../src/bruno/export/auth-document.js';

describe('authDocumentOf: the schemes that sign the send', () => {
    it('writes a digest auth with the password typed in the workspace', () => {
        expect(authDocumentOf({ type: 'digest', username: 'ana', password: 'hunter2' })).toEqual({
            type: 'digest',
            username: 'ana',
            password: 'hunter2',
        });
    });

    it('writes an AWS signature with only the fields the level wrote', () => {
        expect(
            authDocumentOf({
                type: 'awsv4',
                accessKeyId: '{{key}}',
                secretAccessKey: '{{secret}}',
            }),
        ).toEqual({ type: 'awsv4', accessKeyId: '{{key}}', secretAccessKey: '{{secret}}' });
    });
});
