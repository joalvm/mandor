import { describe, expect, it } from 'vitest';

import { authDocumentOf } from '../../../src/insomnia/export/auth-document.js';

describe('authDocumentOf: the schemes that sign the send', () => {
    it('writes a digest auth with the password typed in the workspace', () => {
        expect(authDocumentOf({ type: 'digest', username: 'ana', password: 'hunter2' })).toEqual({
            type: 'digest',
            username: 'ana',
            password: 'hunter2',
        });
    });

    it('writes an AWS signature as the iam scheme Insomnia knows', () => {
        expect(
            authDocumentOf({
                type: 'awsv4',
                accessKeyId: '{{key}}',
                secretAccessKey: '{{secret}}',
                region: 'eu-west-1',
                service: 's3',
                sessionToken: 'literal',
            }),
        ).toEqual({
            type: 'iam',
            accessKeyId: '{{key}}',
            secretAccessKey: '{{secret}}',
            region: 'eu-west-1',
            service: 's3',
            sessionToken: 'literal',
        });
    });
});
