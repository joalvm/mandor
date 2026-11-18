import type { SyncSendReason } from './sync-send-reason.js';

/**
 * Which of the two abort signals fired: the one the caller holds (`user`), the total timeout
 * the transport started (`total`), or none — the request died on its own. The distinction is
 * the difference between `aborted` and `timeout-total`, and it cannot be read off the combined
 * signal undici receives, because `AbortSignal.any` hides which arm tripped.
 */
export type AbortSource = 'user' | 'total' | 'none';

/** What each abort arm means once it fired. With none fired, the error has to say why. */
const REASON_OF_SOURCE: Record<AbortSource, SyncSendReason | undefined> = {
    user: 'aborted',
    total: 'timeout-total',
    none: undefined,
};

/** The system and undici codes the transport names, each with its reason. A map: the key is not ours. */
const REASON_OF_CODE: ReadonlyMap<string, SyncSendReason> = new Map<string, SyncSendReason>([
    ['UND_ERR_CONNECT_TIMEOUT', 'timeout-connect'],
    ['ENOTFOUND', 'dns'],
    ['EAI_AGAIN', 'dns'],
    ['ECONNREFUSED', 'refused'],
    ['UND_ERR_ABORTED', 'aborted'],
    ['ERR_HTTP_VERSION_REFUSED', 'http-version'],
    // A server that speaks ALPN and shares no protocol with the offer ends the handshake so.
    ['ERR_SSL_TLSV1_ALERT_NO_APPLICATION_PROTOCOL', 'http-version'],
]);

/** The text `code` an error carries, when it carries one. */
function codeIn(value: unknown): string | undefined {
    const code: unknown = value instanceof Error && 'code' in value ? value.code : undefined;

    return typeof code === 'string' ? code : undefined;
}

/** The system or undici code, following undici's habit of wrapping the real error in `cause`. */
function codeOf(error: unknown): string | undefined {
    return codeIn(error) ?? codeIn(error instanceof Error ? error.cause : undefined);
}

function namesTls(code: string | undefined, message: string): boolean {
    return (code !== undefined && /CERT|TLS/.test(code)) || /certificate|tls\/ssl/i.test(message);
}

function reasonOfError(error: unknown): SyncSendReason {
    const code = codeOf(error);
    const mapped = code === undefined ? undefined : REASON_OF_CODE.get(code);
    const message = error instanceof Error ? error.message : String(error);

    if (mapped !== undefined) {
        return mapped;
    }

    if (namesTls(code, message)) {
        return 'tls';
    }

    return 'unknown';
}

/** Why a request died without a response: the abort that fired, or what the error names. */
export function errorReasonOf(error: unknown, source: AbortSource): SyncSendReason {
    return REASON_OF_SOURCE[source] ?? reasonOfError(error);
}
