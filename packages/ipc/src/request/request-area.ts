import type { HttpResponse } from '@mandor/schema';

import type { Empty, Result } from '../result/result.js';
import type { BodyWindow, RequestBodyReadRequest } from './request-body-read.js';
import type { RequestBodySaveRequest } from './request-body-save.js';
import type { RequestCancelRequest } from './request-cancel.js';
import type { RequestScriptOutput } from './request-script-output.js';
import type { RequestSendRequest } from './request-send.js';

/**
 * What a window of Sync asks of main to send a request and read what came back. Only Sync
 * serves it, so it sits beside its channels and not in the core.
 */
export type RequestArea = {
    /** Resolves the request against the environment, sends it and answers the response. */
    send: (input: RequestSendRequest) => Promise<Result<HttpResponse>>;
    /** Cuts the send in flight with this id. */
    cancel: (input: RequestCancelRequest) => Promise<Result<Empty>>;
    /** Reads one window of a body that went to disk. */
    readBody: (input: RequestBodyReadRequest) => Promise<Result<BodyWindow>>;
    /** Saves a body where the user picks; null when the dialog was closed. */
    saveBody: (input: RequestBodySaveRequest) => Promise<Result<{ path: string | null }>>;
    /** The answer with every secret hidden, of any length: what a file others read may hold. */
    hideSecrets: (response: HttpResponse) => Promise<Result<HttpResponse>>;
    /** What the scripts of a send said, pushed as each of its phases ends; gives the unsubscribe. */
    onScriptOutput: (handler: (push: RequestScriptOutput) => void) => () => void;
};
