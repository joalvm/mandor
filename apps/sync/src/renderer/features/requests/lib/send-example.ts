import { envStore } from '@mandor/env';
import { exampleItemOf, examplePartsOf } from '@mandor/collections';
import { exampleRequest, type RequestExample } from '@mandor/schema';

import { requestsStore } from '../requests-store.js';
import { exampleAt } from './example-draft-write.js';
import { withRequestDefaults, type SendInput } from './send-input.js';
import { sendWith, sendWithoutScripts } from './send-item.js';

/** The example as its tab shows it: what is typed goes in front of what the file says. */
function currentExampleOf(resource: string, item: string, key: string): RequestExample | undefined {
    const state = requestsStore.getState();

    return state.exampleDrafts[resource]?.example ?? exampleAt(state.requests[item], key);
}

/**
 * What main needs to send an example: the request it hangs from with the example laid over it,
 * as the tab shows it, under the defaults of the app, from where the request lives and with the
 * environment active in its workspace. `null` while the request is not read or the example is
 * not in it.
 */
export function exampleSendInputOf(resource: string): SendInput | null {
    const parts = examplePartsOf(resource);
    const item = exampleItemOf(resource);

    if (parts === null || item === null) {
        return null;
    }

    const parent = requestsStore.getState().requests[item];
    const example = currentExampleOf(resource, item, parts.key);

    if (parent === undefined || example === undefined) {
        return null;
    }

    return {
        environmentId: envStore.getState().activeEnvironmentIds[parts.workspaceId] ?? null,
        itemPath: parts.itemPath,
        request: withRequestDefaults(exampleRequest(parent, example)),
        workspaceId: parts.workspaceId,
    };
}

/** Sends an example. The answer is filed under the example, so its tab keeps its own. */
export async function sendExample(resource: string): Promise<void> {
    await sendWith(resource, exampleSendInputOf(resource));
}

/** Sends an example with no script run: the way out of a script that breaks its send. */
export async function sendExampleWithoutScripts(resource: string): Promise<void> {
    await sendWithoutScripts(resource, exampleSendInputOf(resource));
}
