/**
 * Why a socket could not open. The list is closed: the window puts each reason in words of its
 * own, and what the libraries raised stays behind for the log.
 */
export type SocketFailureReason = 'dns' | 'refused' | 'tls' | 'timeout' | 'rejected' | 'unknown';

/** The system codes the network layer raises, each with its reason. A map: the key is not ours. */
const REASON_OF_CODE = new Map<string, SocketFailureReason>([
    ['ENOTFOUND', 'dns'],
    ['EAI_AGAIN', 'dns'],
    ['ECONNREFUSED', 'refused'],
    ['ETIMEDOUT', 'timeout'],
]);

/** Every certificate and handshake code of OpenSSL and of Node's TLS names one of these. */
const TLS_CODE = /CERT|TLS|SSL|VERIFY/u;

/** What the libraries say when no code does: ws on its handshake, Socket.IO on its own. */
const REASON_OF_MESSAGE: readonly (readonly [RegExp, SocketFailureReason])[] = [
    [/^Opening handshake has timed out$/u, 'timeout'],
    [/^timeout$/u, 'timeout'],
    [/^Unexpected server response: \d+$/u, 'rejected'],
];

/** The deepest a cause is followed: the libraries wrap twice at most. */
const DEPTH = 4;

/**
 * The reason the first error in the chain names. The chain is what the libraries wrap: Socket.IO
 * keeps the error event of its websocket in `description` and the error inside it in `error`, a
 * failed polling request keeps the status in `description` and the cause in its request, and an
 * address with several families raises one error per attempt.
 */
export function socketFailureReasonOf(error: unknown): SocketFailureReason {
    for (const each of chainOf(error, DEPTH)) {
        const reason = reasonOf(each);

        if (reason !== undefined) {
            return reason;
        }
    }

    return 'unknown';
}

function chainOf(error: unknown, depth: number): unknown[] {
    if (depth === 0 || typeof error !== 'object' || error === null) {
        return [error];
    }

    const wrapped = [
        field(error, 'cause'),
        field(error, 'description'),
        field(error, 'error'),
        field(field(error, 'context'), 'statusText'),
        ...listOf(field(error, 'errors')),
    ];

    return [
        error,
        ...wrapped.filter((each) => each !== undefined).flatMap((each) => chainOf(each, depth - 1)),
    ];
}

function reasonOf(value: unknown): SocketFailureReason | undefined {
    // A polling request that got an answer: the server spoke HTTP and said no.
    if (typeof value === 'number') {
        return value >= 400 ? 'rejected' : undefined;
    }

    // Socket.IO raises the refusal of a namespace with the server's own words and its `data`.
    if (typeof value === 'object' && value !== null && Object.hasOwn(value, 'data')) {
        return 'rejected';
    }

    return reasonOfCode(field(value, 'code')) ?? reasonOfMessage(field(value, 'message'));
}

function reasonOfCode(code: unknown): SocketFailureReason | undefined {
    if (typeof code !== 'string') {
        return undefined;
    }

    return REASON_OF_CODE.get(code) ?? (TLS_CODE.test(code) ? 'tls' : undefined);
}

function reasonOfMessage(message: unknown): SocketFailureReason | undefined {
    if (typeof message !== 'string') {
        return undefined;
    }

    return REASON_OF_MESSAGE.find(([pattern]) => pattern.test(message))?.[1];
}

function listOf(value: unknown): readonly unknown[] {
    return Array.isArray(value) ? value : [];
}

function field(value: unknown, key: string): unknown {
    return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined;
}
