import type { ResponseCookie } from '../response/http-response.js';
import type { AuthConfig } from '../auth/auth-config.js';
import type { RequestBody } from './request-body.js';
import type { RequestLine } from './request-line.js';
import type { RequestSettingsOverrides } from './request-settings.js';

/**
 * What an example changes of the request it hangs from. Only the fields whose value differs from
 * the parent are written; the rest is the parent's at the moment of reading. Name, method and
 * url are never here: they are edited in the request.
 */
export type RequestExampleOverrides = {
    query?: RequestLine[] | undefined;
    headers?: RequestLine[] | undefined;
    pathParams?: RequestLine[] | undefined;
    body?: RequestBody | undefined;
    auth?: AuthConfig | undefined;
    settings?: RequestSettingsOverrides | undefined;
    description?: string | undefined;
};

/**
 * The response a request is expected to answer with, and what its request changes to get it:
 * the status, the type and the body as written, the headers and cookies when they are known, the
 * overrides of the request that provoke it, and the shape every answer like it must keep. Two
 * examples of one status may answer to different shapes: the params they send tell them apart.
 */
export type RequestExample = {
    name: string;
    status: string;
    contentType: string;
    body: string;
    /** The headers expected, in the shape of the headers of a received response. */
    headers?: [string, string][] | undefined;
    cookies?: ResponseCookie[] | undefined;
    request?: RequestExampleOverrides | undefined;
    /** The JSON Schema of the answer, as text. Absent until somebody writes one. */
    schema?: string | undefined;
};
