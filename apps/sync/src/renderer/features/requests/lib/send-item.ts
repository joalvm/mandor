import type { RequestSendRequest } from '@mandor/ipc';
import { settlePendingWrites } from '@mandor/shell';

import { syncBridge } from '../../../app/sync-bridge.js';
import { requestsStore } from '../requests-store.js';
import { scriptOutputStore } from './script-output-store.js';
import type { SendOutcome } from '../responses.slice.js';
import { sendInputOf, type SendInput } from './send-input.js';

/**
 * What the send came to. An answer the bridge refuses to parse is a bug of main, not something
 * the user did: it ends the send as an unknown failure instead of leaving it sending for good.
 * Main reads the variables from disk: what was typed a moment ago has to reach it first.
 */
async function outcomeOf(input: RequestSendRequest): Promise<SendOutcome> {
    try {
        await settlePendingWrites();

        const result = await syncBridge.request.send(input);

        return result.ok
            ? { query: input.request.query, response: result.value, state: 'done' }
            : { error: result.error.code, state: 'failed' };
    } catch {
        return { error: 'unknown', state: 'failed' };
    }
}

/**
 * Files the answer of a send under the resource, from whatever input the caller built. Main
 * resolves the variables against the active environment of the workspace and answers once. A
 * second send while one is in flight is ignored, because the bar offers abort in its place.
 */
export async function sendWith(resource: string, input: SendInput | null): Promise<void> {
    const state = requestsStore.getState();

    if (input === null || state.sends[resource]?.state === 'sending') {
        return;
    }

    const sendId = crypto.randomUUID();

    state.beginSend(resource, sendId);
    // Main tells what the scripts said while the send is still on its way: it is awaited from now.
    scriptOutputStore.getState().expect(sendId, {
        workspaceId: input.workspaceId,
        environmentId: input.environmentId ?? '',
        title: `${input.request.method} ${input.request.name}`,
    });

    const outcome = await outcomeOf({ ...input, sendId });

    requestsStore.getState().finishSend(resource, sendId, outcome);
}

/**
 * Sends the request of a resource as the store holds it, which is as the screen shows it: the
 * last keystrokes still waiting to be written are in it. The answer is filed under the resource.
 */
export async function sendItem(resource: string): Promise<void> {
    await sendWith(resource, sendInputOf(resource));
}

/**
 * Sends with none of the scripts of the request, nor those of the folders above it: the way out
 * of a script that breaks every send. What the other places set before stays where it was. The
 * input is the request of the resource unless the caller built another one, as an example does.
 */
export async function sendWithoutScripts(
    resource: string,
    input: SendInput | null = sendInputOf(resource),
): Promise<void> {
    await sendWith(resource, input === null ? null : { ...input, skipScripts: true });
}
