import { itemTitle } from '@mandor/collections';
import { envStore } from '@mandor/env';
import type { RequestSendRequest } from '@mandor/ipc';
import { effectiveRequestSettings, type RequestItem } from '@mandor/schema';

import { requestDefaultsStore } from '../request-defaults-store.js';
import { requestsStore } from '../requests-store.js';
import { requestPartsOf } from './request-parts.js';

/**
 * The request as it goes out: what it kept of its own settings, over the defaults of the app.
 * Main fills nothing from the defaults, which live here; it only reads what arrives.
 */
export function withRequestDefaults(request: RequestItem): RequestItem {
    return {
        ...request,
        settings: effectiveRequestSettings(
            request.settings,
            requestDefaultsStore.getState().defaults,
        ),
    };
}

export type SendInput = Omit<RequestSendRequest, 'sendId'>;

/**
 * What main needs to resolve the request of a resource as a send would: the request as the store
 * holds it, which is as the screen shows it, with the defaults it follows, where it lives in the
 * collection — nowhere, for one saved nowhere yet — and the environment active in its workspace.
 * `null` while the resource is not loaded.
 */
export function sendInputOf(resource: string): SendInput | null {
    return inputOf(resource, withRequestDefaults);
}

/**
 * What main needs to write the request of a resource as code: as for a send, but with only the
 * settings the request kept. A default of the app is not the request's to say, and written into
 * every command it would read as something the user asked for.
 */
export function snippetInputOf(resource: string): SendInput | null {
    return inputOf(resource, (request) => request);
}

/**
 * The request under the name the tree shows now: a rename made while the tab stayed open moves the
 * tree and the file, not the draft read before. Main names the request with it where a script of
 * it breaks, and the console heads the send with it. One the tree does not hold keeps its own.
 */
function named(resource: string, request: RequestItem): RequestItem {
    const shown = itemTitle(resource);

    return shown === '' ? request : { ...request, name: shown };
}

function inputOf(
    resource: string,
    settled: (request: RequestItem) => RequestItem,
): SendInput | null {
    const parts = requestPartsOf(resource);
    const request = requestsStore.getState().requests[resource];

    if (parts === null || request === undefined) {
        return null;
    }

    return {
        environmentId: envStore.getState().activeEnvironmentIds[parts.workspaceId] ?? null,
        itemPath: parts.path,
        request: named(resource, settled(request)),
        workspaceId: parts.workspaceId,
    };
}
