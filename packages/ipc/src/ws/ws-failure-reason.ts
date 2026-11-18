import { z } from 'zod';

import type { ErrorCode } from '../result/error-code.js';

/** Why a socket could not open, as main tells the window. The transport names the same six. */
export const wsFailureReasonSchema = z.enum([
    'dns',
    'refused',
    'tls',
    'timeout',
    'rejected',
    'unknown',
]);

export type WsFailureReason = z.infer<typeof wsFailureReasonSchema>;

/**
 * What the window says for each reason. A name that does not resolve and a port nobody listens
 * on ask the same of the user: check the address and the network.
 */
export const WS_FAILURE_CODE: Record<WsFailureReason, ErrorCode> = {
    dns: 'ws-open-unreachable',
    refused: 'ws-open-unreachable',
    tls: 'ws-open-tls',
    timeout: 'ws-open-timeout',
    rejected: 'ws-open-rejected',
    unknown: 'ws-open-failed',
};
