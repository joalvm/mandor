import { afterEach, describe, expect, it, vi } from 'vitest';

import { startKeepalive, type KeepaliveSocket } from '../../src/client/keepalive-watchdog.js';

type FakeSocket = KeepaliveSocket & {
    pings: number;
    pongListeners: (() => void)[];
};

/** A line that never answers: pings are counted and nothing comes back. */
function muteSocket(): FakeSocket {
    return {
        pings: 0,
        pongListeners: [],
        ping() {
            this.pings += 1;
        },
        on(_event, listener) {
            this.pongListeners.push(listener);
        },
        off(_event, listener) {
            this.pongListeners = this.pongListeners.filter((each) => each !== listener);
        },
    };
}

/** A line that answers every ping with a pong, a moment after it goes out. */
function answeringSocket(): FakeSocket {
    const socket = muteSocket();

    socket.ping = () => {
        socket.pings += 1;
        setTimeout(() => {
            socket.pongListeners.forEach((listener) => {
                listener();
            });
        }, 100);
    };

    return socket;
}

const KEEPALIVE = { intervalMs: 1_000, pongTimeoutMs: 5_000 };

describe('startKeepalive', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('sends a ping on every interval and a line that answers is never dropped', () => {
        vi.useFakeTimers();
        const socket = answeringSocket();
        let drops = 0;
        const stop = startKeepalive(socket, KEEPALIVE, () => {
            drops += 1;
        });

        vi.advanceTimersByTime(20_000);

        expect(socket.pings).toBe(20);
        expect(drops).toBe(0);
        stop();
    });

    it('takes the line for dropped once when the pong never arrives', () => {
        vi.useFakeTimers();
        const socket = muteSocket();
        let drops = 0;
        const stop = startKeepalive(socket, KEEPALIVE, () => {
            drops += 1;
        });

        vi.advanceTimersByTime(60_000);

        expect(drops).toBe(1);
        stop();
    });

    /** The defaults of a connection beat every 30s and give the pong 10s: the wait is per ping. */
    it('never drops a line that answers when the interval outlasts the pong timeout', () => {
        vi.useFakeTimers();
        const socket = answeringSocket();
        let drops = 0;
        const stop = startKeepalive(socket, { intervalMs: 30_000, pongTimeoutMs: 10_000 }, () => {
            drops += 1;
        });

        vi.advanceTimersByTime(120_000);

        expect(socket.pings).toBe(4);
        expect(drops).toBe(0);
        stop();
    });

    it('drops a mute line one pong timeout after the ping it never answered', () => {
        vi.useFakeTimers();
        const socket = muteSocket();
        let drops = 0;
        const stop = startKeepalive(socket, { intervalMs: 30_000, pongTimeoutMs: 10_000 }, () => {
            drops += 1;
        });

        vi.advanceTimersByTime(39_999);

        expect(drops).toBe(0);

        vi.advanceTimersByTime(120_001);

        expect(drops).toBe(1);
        expect(socket.pings).toBe(1);
        stop();
    });

    it('stops pinging and stops listening once stopped', () => {
        vi.useFakeTimers();
        const socket = answeringSocket();
        const stop = startKeepalive(socket, KEEPALIVE, () => undefined);

        stop();

        const pings = socket.pings;

        vi.advanceTimersByTime(60_000);

        expect(socket.pings).toBe(pings);
        expect(socket.pongListeners).toEqual([]);
    });
});
