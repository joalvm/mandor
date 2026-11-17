import type { Channel } from '@mandor/ipc';

import type { BridgeIpc } from '../preload/bridge-ipc.js';

type Listener = (event: unknown, push: unknown) => void;

/** What a test of a bridge reads back from the `ipcRenderer` it stood in for. */
type BridgeIpcSpy = BridgeIpc & {
    /** Every invoke, in order, with the payload as it crossed. */
    calls: [channel: Channel, payload: unknown][];
    listeners: Map<Channel, Listener[]>;
    /** Pushes to the listeners of a channel, the way main sends to the window. */
    emit: (channel: Channel, push: unknown) => void;
};

/** The answer of a channel the test set nothing for. A refusal fits the contract of every one. */
export const REFUSED = { ok: false, error: { code: 'bad-request', message: 'refused' } } as const;

/**
 * Stands in for `ipcRenderer` so a bridge can be exercised in a plain node test, in the host or
 * in an app. Each channel answers what `answers` gives it and refuses otherwise, so a test that
 * only looks at where a call went names no value.
 */
export function spyBridgeIpc(answers: Partial<Record<Channel, unknown>> = {}): BridgeIpcSpy {
    const calls: [Channel, unknown][] = [];
    const listeners = new Map<Channel, Listener[]>();

    return {
        calls,
        listeners,
        emit: (channel, push) => {
            for (const listener of listeners.get(channel) ?? []) {
                listener({}, push);
            }
        },
        invoke: (channel, payload) => {
            calls.push([channel, payload]);

            return Promise.resolve(channel in answers ? answers[channel] : REFUSED);
        },
        on: (channel, listener) => {
            listeners.set(channel, [...(listeners.get(channel) ?? []), listener]);
        },
        removeListener: (channel, listener) => {
            const kept = (listeners.get(channel) ?? []).filter((each) => each !== listener);

            listeners.set(channel, kept);
        },
    };
}
