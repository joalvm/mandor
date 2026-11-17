import type { AbortSource } from './error-reason-of.js';

/**
 * Which of the two abort arms fired. The caller's signal and the transport's total timeout race
 * inside `AbortSignal.any`, which does not say which one tripped, so the transport listens to
 * both and remembers. Read once, after the failure: `source()` is the memory of the race.
 */
export type AbortWatch = {
    combined: AbortSignal;
    source: () => AbortSource;
    /**
     * Ends the race once the send is over. A clock left running holds its signal, its listener
     * and what they close over until it fires: minutes per send, thousands of sends a day.
     */
    stop: () => void;
};

export function watchAborts(signal: AbortSignal, totalMs: number): AbortWatch {
    const total = new AbortController();
    let fired: AbortSource = 'none';

    function onCaller(): void {
        fired = 'user';
    }

    const clock = setTimeout(() => {
        fired = 'total';
        total.abort(new DOMException('the send ran out of time', 'TimeoutError'));
    }, totalMs);

    // Like the clock of `AbortSignal.timeout`, it does not keep the process alive on its own.
    clock.unref();
    signal.addEventListener('abort', onCaller, { once: true });

    return {
        combined: AbortSignal.any([signal, total.signal]),
        source: () => fired,
        stop: () => {
            clearTimeout(clock);
            signal.removeEventListener('abort', onCaller);
        },
    };
}
