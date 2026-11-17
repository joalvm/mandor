import { GitError } from '@mandor/git';
import { ImportOtherAppError } from '@mandor/interop-core';
import { failure, type Err, type ErrorCode } from '@mandor/ipc';
import { FormatError, FormatVersionError, IdError } from '@mandor/schema';
import { FileReadError, NameTakenError, RootItemError } from '@mandor/store-fs';
import { UnsafeAuthorityError } from '@mandor/vars';

import { AuthTokenError } from '../auth/auth-token-error.js';
import { ConflictOpenError } from '../conflict/conflict-open-error.js';
import { ImportCancelledError } from '../import/import-cancelled-error.js';
import { NetworkFileError } from '../network/network-file-error.js';
import { UnsupportedProxyError } from '../network/unsupported-proxy-error.js';
import { OriginForeignError } from '../origin/origin-foreign-error.js';
import { OriginUnreachableError } from '../origin/origin-unreachable-error.js';

/** An error class the bridge reports with one code, whatever the instance says. */
type CodedBy = {
    error: abstract new (...args: never[]) => Error;
    code: ErrorCode;
};

/** Errors that carry no code of their own: each class always means the same refusal. */
const CODE_OF_CLASS: readonly CodedBy[] = [
    // The address answered with somebody else's work. The interface says so and brings nothing.
    { error: OriginForeignError, code: 'origin-foreign' },
    // The address did not answer, so there is nothing to open. The interface says to check it.
    { error: OriginUnreachableError, code: 'origin-unreachable' },
    // A clash was asked to close with questions left: nothing was written, and the tab says so.
    { error: ConflictOpenError, code: 'conflict-open' },
    // The name asked for is somebody else's, and nothing was written. The interface says so.
    { error: NameTakenError, code: 'name-taken' },
    // A certificate the network settings name is gone: the settings say which, the log says where.
    { error: NetworkFileError, code: 'network-file' },
    // The system named a proxy no transport speaks: nothing went direct, and the interface says so.
    { error: UnsupportedProxyError, code: 'network-proxy' },
    { error: FileReadError, code: 'fs-read' },
    // The pick held more than an import reads: nothing was read, and the interface says the limits.
    { error: ImportCancelledError, code: 'import-cancelled' },
    // The document was written by the other app, whose items this one has no tab for.
    { error: ImportOtherAppError, code: 'import-other-app' },
    // The file was written by a newer build: nothing here can read it, updating the app can.
    { error: FormatVersionError, code: 'format-newer' },
    // The domain refused the data, and the data came from the renderer: a name the renderer
    // sent, a move the shape of the collection refuses, or a connection whose url and
    // transport do not go together.
    { error: IdError, code: 'bad-request' },
    { error: FormatError, code: 'bad-request' },
    { error: RootItemError, code: 'bad-request' },
    { error: UnsafeAuthorityError, code: 'bad-request' },
];

/**
 * Turns whatever a handler threw into the refusal that crosses the bridge. The code is what
 * the interface decides on and the message is for the log alone: git prints remotes and the
 * filesystem prints paths of the user, and neither belongs on the screen.
 */
export function failureOf(error: unknown): Err {
    const coded = CODE_OF_CLASS.find((entry) => error instanceof entry.error);

    if (error instanceof GitError) {
        return failure(error.code, error.detail);
    }

    // The token did not come: refused by the server, an endpoint not to be trusted, or stopped.
    if (error instanceof AuthTokenError) {
        return failure(error.code, error.message);
    }

    if (coded !== undefined && error instanceof Error) {
        return failure(coded.code, error.message);
    }

    return failure('unknown', String(error));
}
