import type { AuthConfig } from '../auth/auth-config.js';
import type { RequestScripts } from '../script/own-scripts.js';
import type { RequestBody } from './request-body.js';
import type { RequestExample } from './request-example.js';
import type { RequestLine } from './request-line.js';
import type { RequestSettingsOverrides } from './request-settings.js';

/**
 * One request of the collection of Sync. Unlike the message of Async, it carries its destination
 * inside: the URL is what gets sent, and it takes a template —`{{baseUrl}}/pedidos`— kept as
 * written, `{{var}}` resolving on the way out.
 */
export type RequestItem = {
    name: string;
    method: string;
    url: string;
    query: RequestLine[];
    headers: RequestLine[];
    /** The value of each `{name}` in the path of the url: single braces, `{{var}}` is a variable. */
    pathParams: RequestLine[];
    body: RequestBody;
    /** The JSON Schema the body promises, as text, copied whole from the document it came from. */
    bodySchema?: string | undefined;
    /** The responses the document shows for this request, each with the schema of its answer. */
    examples: RequestExample[];
    /** What this request decided for its send; the rest follows the defaults of the app. */
    settings: RequestSettingsOverrides;
    /**
     * What this request is for, in markdown. Absent until somebody writes it, because empty is
     * not a text.
     */
    description?: string | undefined;
    /** The auth of this request. Absent inherits from its folders, and then from the workspace. */
    auth?: AuthConfig | undefined;
    /** The scripts of this request, one per event: written here or brought by an import, not yet approved. */
    scripts?: RequestScripts | undefined;
};
