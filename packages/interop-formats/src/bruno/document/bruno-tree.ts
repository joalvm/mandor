import type { RequestScripts } from '@mandor/schema';

/** A header, a parameter or a field of a form, as Bruno lists it. */
export type BrunoRow = { name: string; value: string; disabled: boolean };

/** A field of a form: `file` names the file it sends, and is empty when the field sends text. */
export type BrunoFormRow = BrunoRow & { file: string };

export type BrunoBody = {
    /** The kind Bruno names: json, text, xml, sparql, form-urlencoded, multipart-form, file or graphql. */
    type: string;
    /** The text of a raw body, or the query of a GraphQL one. */
    text: string;
    /** The variables of a GraphQL body. */
    variables: string;
    rows: BrunoFormRow[];
    /** The file a `file` body sends. */
    file: string;
};

/**
 * What a level asks of auth, flat and in the words of this reader whichever layout it came in.
 * `type` names the scheme (`basic`, `bearer`, `apikey`, `oauth2`, `inherit`, `none`, or another
 * Bruno has that Mandor does not); the rest are its fields: `username`, `password`, `token`,
 * `key`, `value`, `placement`, and for `oauth2` the `flow`, the urls, the client, the `scope`,
 * `pkce` and where the credentials travel.
 */
export type BrunoAuth = Record<string, unknown>;

export type BrunoRequest = {
    kind: 'request';
    tags: string[];
    name: string;
    seq: number;
    method: string;
    url: string;
    description: string;
    headers: BrunoRow[];
    params: BrunoRow[];
    pathParams: BrunoRow[];
    body: BrunoBody | undefined;
    auth: BrunoAuth | undefined;
    settings: BrunoSettings;
    examples: BrunoExample[];
    /** The scripts of the request, by the moment Mandor runs them at; the tests go after the response. */
    scripts: RequestScripts | undefined;
    /** What the request keeps that Mandor has no place for (assertions, request variables…), by name. */
    leftOut: string[];
};

/** What a request decides of how it is sent; what it leaves to inherit is not here. */
export type BrunoSettings = {
    encodeUrl?: boolean;
    timeout?: number;
    followRedirects?: boolean;
    maxRedirects?: number;
    forwardAuthorizationHeader?: boolean;
};

/** The request an example was saved with. */
export type BrunoExampleRequest = {
    url: string;
    headers: BrunoRow[];
    params: BrunoRow[];
    pathParams: BrunoRow[];
    body: BrunoBody | undefined;
};

/** A response a request keeps as an example, and the request it answered when it says so. */
export type BrunoExample = {
    name: string;
    description: string;
    status: string;
    headers: BrunoRow[];
    bodyType: string;
    body: string;
    request: BrunoExampleRequest | undefined;
};

/** A message a WebSocket request keeps saved: its title, how Bruno types it and what it sends. */
export type BrunoMessage = { title: string; type: string; data: string };

export type BrunoWebSocket = {
    kind: 'websocket';
    name: string;
    seq: number;
    url: string;
    description: string;
    headers: BrunoRow[];
    auth: BrunoAuth | undefined;
    messages: BrunoMessage[];
    /** What the request keeps that Mandor has no place for (scripts, settings…), by name. */
    leftOut: string[];
};

export type BrunoFolder = {
    kind: 'folder';
    name: string;
    seq: number;
    description: string;
    headers: BrunoRow[];
    auth: BrunoAuth | undefined;
    variables: BrunoVariable[];
    children: BrunoNode[];
    scripts: RequestScripts | undefined;
    leftOut: string[];
};

export type BrunoNode = BrunoFolder | BrunoRequest | BrunoWebSocket;

export type BrunoVariable = { name: string; value: string; disabled: boolean; secret: boolean };

export type BrunoEnvironment = { name: string; variables: BrunoVariable[] };

/** A thing of the folder that is not an HTTP request, named so the import can say it left it out. */
export type BrunoSkipped = { kind: string; name: string };

/** A collection of Bruno, whichever layout it came in: both end in this tree. */
export type BrunoDocument = {
    sourceId: string;
    name: string;
    description: string;
    headers: BrunoRow[];
    auth: BrunoAuth | undefined;
    variables: BrunoVariable[];
    children: BrunoNode[];
    environments: BrunoEnvironment[];
    skipped: BrunoSkipped[];
    scripts: RequestScripts | undefined;
    leftOut: string[];
};
