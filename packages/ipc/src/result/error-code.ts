import { z } from 'zod';

/**
 * Every failure that can cross the bridge, named by where it comes from. The interface
 * decides on the code alone; the message that travels with it is for the log.
 */
export const errorCodeSchema = z.enum([
    'fs-read',
    'fs-write',
    'git-missing',
    'git-not-a-repo',
    'git-failed',
    'origin-foreign',
    'origin-unreachable',
    'ws-open-failed',
    'ws-open-cancelled',
    'ws-open-unreachable',
    'ws-open-tls',
    'ws-open-timeout',
    'ws-open-rejected',
    'ws-connection-lost',
    'ws-send-failed',
    'record-active',
    'request-failed',
    'request-aborted',
    'request-timeout',
    'request-tls',
    'request-http-version',
    'request-unreachable',
    'request-redirect',
    'request-file',
    'request-too-large',
    'request-closed',
    'request-invalid',
    'network-file',
    'network-proxy',
    'graphql-introspection',
    'snippet-failed',
    'script-failed',
    'auth-token-failed',
    'auth-cancelled',
    'name-taken',
    'not-found',
    'conflict-open',
    'bad-request',
    'import-format-unknown',
    'import-other-app',
    'format-newer',
    'import-cancelled',
    'unknown',
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;
