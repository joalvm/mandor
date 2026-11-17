import { failure } from '@mandor/ipc';
import { SyncSendError, type SyncSendReason } from '@mandor/transport-sync';
import { describe, expect, it } from 'vitest';

import { failureOfSend } from '../../../../src/main/request/failure-of-send.js';
import { RepoFileError } from '../../../../src/main/request/repo-file-error.js';

describe('the code a failed send crosses the bridge with', () => {
    it.each<[SyncSendReason, string]>([
        ['aborted', 'request-aborted'],
        ['timeout-connect', 'request-timeout'],
        ['timeout-total', 'request-timeout'],
        ['tls', 'request-tls'],
        ['http-version', 'request-http-version'],
        ['dns', 'request-unreachable'],
        ['refused', 'request-unreachable'],
        ['redirect-scheme', 'request-redirect'],
        ['redirect-limit', 'request-redirect'],
        ['scheme', 'request-failed'],
        ['unknown', 'request-failed'],
    ])('names `%s` as %s', (reason, code) => {
        expect(failureOfSend(new SyncSendError(reason, 'boom'))).toEqual(
            failure(code as never, 'boom'),
        );
    });

    it('names a file the request could not read', () => {
        expect(failureOfSend(new RepoFileError('x'))).toMatchObject({
            ok: false,
            error: { code: 'request-file' },
        });
    });

    it('leaves what it does not know to the kit of the host', () => {
        expect(failureOfSend(new Error('who knows'))).toMatchObject({
            ok: false,
            error: { code: 'unknown' },
        });
    });
});
