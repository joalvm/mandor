import type { ErrorCode, RequestBodySaveRequest } from '@mandor/ipc';
import type { HttpResponse } from '@mandor/schema';

import { syncBridge } from '../../app/sync-bridge.js';
import { bodyFileName, contentTypeOf, type BodyKind } from './body-views.js';

/** How a save ended: `cancelled` is the user closing the dialog, which is not a failure. */
export type SaveOutcome =
    { error: ErrorCode; state: 'failed' } | { state: 'cancelled' } | { state: 'saved' };

/** What main is asked to save: the file it wrote, or the text or base64 the window still holds. */
function saveRequestOf(
    response: HttpResponse,
    suggestedName: string,
): RequestBodySaveRequest | null {
    const { body } = response;

    if (body === null) {
        return null;
    }

    if (body.kind === 'stored') {
        return { ref: body.ref, suggestedName };
    }

    if (body.encoding === 'utf8') {
        return { encoding: 'utf8', suggestedName, text: body.text };
    }

    return { data: body.data, encoding: 'base64', suggestedName };
}

/**
 * Saves the body of a response where the user picks, which main asks of them: the renderer never
 * names a path. A response with no body has nothing to save and says it was cancelled.
 */
export async function saveBody(response: HttpResponse, kind: BodyKind): Promise<SaveOutcome> {
    const request = saveRequestOf(response, bodyFileName(contentTypeOf(response), kind));

    if (request === null) {
        return { state: 'cancelled' };
    }

    try {
        const result = await syncBridge.request.saveBody(request);

        if (!result.ok) {
            return { error: result.error.code, state: 'failed' };
        }

        return { state: result.value.path === null ? 'cancelled' : 'saved' };
    } catch {
        return { error: 'unknown', state: 'failed' };
    }
}
