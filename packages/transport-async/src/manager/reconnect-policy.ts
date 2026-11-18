/** How retries wait: exponential growth with a ceiling, so a dead server is not hammered. */
export type ReconnectPolicy = {
    baseMs: number;
    ceilingMs: number;
    maxAttempts: number;
    /** Randomizes the wait by this fraction either way; absent means the 0.2 default applies. */
    spread?: number | undefined;
};

export const DEFAULT_RECONNECT_POLICY: ReconnectPolicy = {
    baseMs: 500,
    ceilingMs: 8_000,
    maxAttempts: 5,
    spread: 0.2,
};

/** Wait before attempt `attempt` (zero-based): base doubled and capped, then spread by `random`. */
export function reconnectDelay(
    attempt: number,
    policy: ReconnectPolicy,
    random: () => number = Math.random,
): number {
    const delay = Math.min(policy.baseMs * 2 ** attempt, policy.ceilingMs);
    const spread = policy.spread ?? 0.2;

    return delay * (1 - spread + random() * spread * 2);
}

/**
 * How long a socket stays open before its drop counts as new trouble and the attempts start
 * again. A server that accepts and hangs up at once would otherwise be retried forever.
 */
const STABLE_OPEN_MS = 5_000;

/** What applying the policy needs of a connection: its attempt count and its timer. */
type RetryableConnection = {
    attempts: number;
    openedOnce: boolean;
    openedAt: number | undefined;
    reconnectTimer: Timer | undefined;
    userClosed: boolean;
};

type Timer = ReturnType<typeof setTimeout>;

/**
 * Schedules the next attempt with backoff, unless the user closed the connection, the socket
 * never got to open — the first attempt failing is not the server hanging up — or the policy
 * ran out of attempts. The timer lives on the connection, so canceling is one lookup. Tells the
 * caller whether it scheduled, gave up (`exhausted`), or neither applied (`skipped`).
 */
export function scheduleRetry(
    connection: RetryableConnection,
    policy: ReconnectPolicy,
    retry: () => void,
): 'exhausted' | 'scheduled' | 'skipped' {
    if (connection.userClosed || !connection.openedOnce) {
        return 'skipped';
    }

    if (connection.attempts >= policy.maxAttempts) {
        return 'exhausted';
    }

    const delay = reconnectDelay(connection.attempts, policy);

    connection.attempts += 1;

    connection.reconnectTimer = setTimeout(() => {
        connection.reconnectTimer = undefined;
        retry();
    }, delay);

    return 'scheduled';
}

/**
 * Closes the open of the attempt: one that lasted starts the count again, a short one keeps
 * counting toward the limit. Answers whether the attempt had opened, which makes its close a drop.
 */
export function endOpen(
    connection: Pick<RetryableConnection, 'attempts' | 'openedAt'>,
    now: number,
): boolean {
    const { openedAt } = connection;

    connection.openedAt = undefined;

    if (openedAt === undefined) {
        return false;
    }

    if (now - openedAt >= STABLE_OPEN_MS) {
        connection.attempts = 0;
    }

    return true;
}

/** What the window sees after a retry: another wait, or the end of the tries. */
const STATE_OF_OUTCOME: Record<'exhausted' | 'scheduled', 'error' | 'reconnecting'> = {
    exhausted: 'error',
    scheduled: 'reconnecting',
};

/** The state push a retry outcome reports, or none when the outcome changes nothing visible. */
export function retryStatePush(
    connectionId: string,
    connection: Pick<RetryableConnection, 'attempts'>,
    outcome: 'exhausted' | 'scheduled' | 'skipped',
): { attempt: number; connectionId: string; state: 'error' | 'reconnecting' } | undefined {
    if (outcome === 'skipped') {
        return undefined;
    }

    return {
        attempt: connection.attempts,
        connectionId,
        state: STATE_OF_OUTCOME[outcome],
    };
}

/** Forgets the wait of a connection that is going away or being replaced. */
export function cancelRetry(connection: Pick<RetryableConnection, 'reconnectTimer'>): void {
    if (connection.reconnectTimer === undefined) {
        return;
    }

    clearTimeout(connection.reconnectTimer);
    connection.reconnectTimer = undefined;
}

/** Cancels a pending reconnect and retries right away. Does nothing with none pending. */
export function retryConnectionNow<C extends Pick<RetryableConnection, 'reconnectTimer'>>(
    connection: C | undefined,
    retry: (connection: C) => void,
): void {
    if (connection?.reconnectTimer === undefined) {
        return;
    }

    cancelRetry(connection);
    retry(connection);
}
