import type { QuickJSContext, QuickJSDeferredPromise } from 'quickjs-emscripten-core';

import type { SendAnswer, SendLink } from '../contract/worker-message.js';

/** The name the guest finds the way out under, before the script runs; the guest then hides it. */
export const HOST_SEND = 'mandorSend';

export type SendBridge = {
    /** Sends the guest made that main has not answered. */
    readonly pending: number;
    /**
     * Waits for main to answer, and gives the answer to the guest; false if it is for no send of
     * this run. Before it waits it says to main that the guest waits, once for each send, as the
     * protocol asks.
     */
    next(): Promise<boolean>;
    /** Lets go of the promises that were never answered. */
    dispose(): void;
};

/**
 * The one function the guest has to the world: `mandorSend(payload)`, a promise for the text main
 * answers with. The engine touches no network; it passes text to main and text back. The answer
 * settles the promise, and the jobs that wait on it run when the caller drains them.
 */
export function newSendBridge(context: QuickJSContext, link: SendLink): SendBridge {
    const open = new Map<string, QuickJSDeferredPromise>();
    let made = 0;
    let announced = 0;

    const send = context.newFunction(HOST_SEND, (payload) => {
        if (context.typeof(payload) !== 'string') {
            return { error: context.newError('A send carries text') };
        }

        made += 1;

        const sendId = String(made);
        const deferred = context.newPromise();

        open.set(sendId, deferred);
        link.send(sendId, context.getString(payload));

        return deferred.handle;
    });

    context.setProp(context.global, HOST_SEND, send);
    send.dispose();

    function answer({ sendId, reply }: SendAnswer): boolean {
        const deferred = open.get(sendId);

        if (deferred === undefined) {
            return false;
        }

        const text = context.newString(reply);

        open.delete(sendId);
        deferred.resolve(text);
        text.dispose();
        deferred.dispose();

        return true;
    }

    function announce(): void {
        if (announced < made) {
            announced += 1;
            link.waiting();
        }
    }

    return {
        get pending() {
            return open.size;
        },
        async next() {
            announce();

            return answer(await link.nextAnswer());
        },
        dispose() {
            open.forEach((deferred) => {
                deferred.dispose();
            });
            open.clear();
        },
    };
}
