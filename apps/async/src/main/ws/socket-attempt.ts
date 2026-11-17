import {
    failure,
    success,
    WS_FAILURE_CODE,
    type Empty,
    type ErrorCode,
    type Result,
} from '@mandor/ipc';

import { AuthTokenError, failureOf, NetworkFileError, UnsupportedProxyError } from '@mandor/host';
import { SocketOpenError } from '@mandor/transport-async';

/** The failures with a code of their own: the interface says why, not just that. */
const SAID_BY_HOST = [AuthTokenError, NetworkFileError, UnsupportedProxyError];

/** The socket channels give nothing back, so only the refusal ever carries anything. */
export async function socketAttempt(
    code: ErrorCode,
    act: () => Promise<void>,
): Promise<Result<Empty>> {
    try {
        await act();

        return success({});
    } catch (error) {
        const said = SAID_BY_HOST.some((known) => error instanceof known);

        // A socket that ended before it opened says why: the window words each reason apart.
        if (error instanceof SocketOpenError) {
            return failure(WS_FAILURE_CODE[error.reason], error.message);
        }

        return said ? failureOf(error) : failure(code, String(error));
    }
}
