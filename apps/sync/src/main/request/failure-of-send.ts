import { failureOf } from '@mandor/host';
import { GraphqlPayloadError } from '@mandor/graphql';
import { failure, type Err, type ErrorCode } from '@mandor/ipc';
import { SyncSendError, type SyncSendReason } from '@mandor/transport-sync';

import { RepoFileError } from './repo-file-error.js';

const CODE_OF_REASON: Record<SyncSendReason, ErrorCode> = {
    aborted: 'request-aborted',
    'timeout-connect': 'request-timeout',
    'timeout-total': 'request-timeout',
    tls: 'request-tls',
    'http-version': 'request-http-version',
    dns: 'request-unreachable',
    refused: 'request-unreachable',
    unreachable: 'request-unreachable',
    closed: 'request-closed',
    invalid: 'request-invalid',
    'redirect-scheme': 'request-redirect',
    'redirect-limit': 'request-redirect',
    'proxy-scheme': 'network-proxy',
    'too-large': 'request-too-large',
    scheme: 'request-failed',
    unknown: 'request-failed',
};

/** The refusal a failed send crosses the bridge with: the reason decides the code. */
export function failureOfSend(error: unknown): Err {
    if (error instanceof SyncSendError) {
        return failure(CODE_OF_REASON[error.reason], error.message);
    }

    if (error instanceof GraphqlPayloadError) {
        return failure('bad-request', error.message);
    }

    if (error instanceof RepoFileError) {
        return failure('request-file', error.message);
    }

    return failureOf(error);
}
