import type { OutboundPort } from './outbound-port.js';

let registered: OutboundPort | null = null;

const listeners = new Set<() => void>();

function tellListeners(): void {
    for (const listener of listeners) {
        listener();
    }
}

/** Declares how frames leave this window, and returns its matching cleanup. */
export function registerOutboundPort(port: OutboundPort): () => void {
    registered = port;

    const stop = port.subscribe(tellListeners);

    tellListeners();

    return () => {
        stop();

        if (registered === port) {
            registered = null;
            tellListeners();
        }
    };
}

/** The port, or nothing when no feature in this app knows how to put a frame on a wire. */
export function outboundPort(): OutboundPort | null {
    return registered;
}

/**
 * Hears every change of what the port answers, the port arriving included: a tab restored with the
 * window mounts before the feature that registers it.
 */
export function subscribeOutbound(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}
