import type { RequestSettingsOverrides } from '@mandor/schema';
import type { AuthSigning } from '@mandor/vars';

import type { ResolvedBody } from './request-templates.js';
import type { GuardedRequest } from './guarded-resolution.js';

/** A request with every template resolved, ready to become bytes or code. */
export type ResolvedRequest = {
    method: string;
    /** With its path parameters in and its query rows appended. */
    url: string;
    /** The rows that are on, then the auth's, then the Cookie of the auth; in that order. */
    headers: [string, string][];
    /** Templates resolved and only the rows that are on. */
    body: ResolvedBody;
    /** What the request kept; the defaults fill the rest where it is sent. */
    settings: RequestSettingsOverrides;
    /** The credentials only the send can apply: a Digest answer, an AWS signature. */
    signing?: AuthSigning | undefined;
    /** What the rule of destination decided, when the send could run scripts. */
    guarded?: GuardedRequest | undefined;
};
