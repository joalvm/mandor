/**
 * What the watchdog needs of the socket it watches: to beat it and to hear the answer. The
 * `ws` socket satisfies this by itself, and a test can stand in for one.
 */
export type KeepaliveSocket = {
    off(event: 'pong', listener: () => void): unknown;
    on(event: 'pong', listener: () => void): unknown;
    ping(): void;
};

export type KeepaliveSettings = {
    /** How long the line stays quiet before a ping goes out. */
    intervalMs: number;
    /** How long a pong may take to answer before the line is taken as dropped. */
    pongTimeoutMs: number;
};

/**
 * Proves the line is alive while nothing is being said: a ping every interval, and each ping
 * waits its own timeout for the pong. The wait starts when the ping leaves, never when the
 * watch started: measured from the last pong, an interval longer than the timeout would drop a
 * healthy line before its first ping had gone out. A pong that overstays drops the line once —
 * whoever watches the socket then sees a close like any other — and the watches stop.
 * The returned function is the teardown: pings stop, the pong listener goes, nothing fires after.
 */
export function startKeepalive(
    socket: KeepaliveSocket,
    settings: KeepaliveSettings,
    onDropped: () => void,
): () => void {
    let deadline: ReturnType<typeof setTimeout> | undefined;

    const hearPong = (): void => {
        clearTimeout(deadline);
        deadline = undefined;
    };

    const pinger = setInterval(() => {
        // A ping still waiting owns the verdict: a second one would only push the wait back.
        if (deadline !== undefined) {
            return;
        }

        socket.ping();
        deadline = setTimeout(() => {
            stop();
            onDropped();
        }, settings.pongTimeoutMs);
    }, settings.intervalMs);

    function stop(): void {
        clearInterval(pinger);
        clearTimeout(deadline);
        deadline = undefined;
        socket.off('pong', hearPong);
    }

    socket.on('pong', hearPong);

    return stop;
}
