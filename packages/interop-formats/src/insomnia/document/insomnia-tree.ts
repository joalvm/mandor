/** A header, a parameter or a field of a form, as Insomnia lists it. */
export type InsomniaRow = {
    name: string;
    value: string;
    disabled: boolean;
    /** `file` for a field of a form that sends a file; absent for text. */
    type: string;
    fileName: string;
};

export type InsomniaBody = {
    mimeType: string;
    text: string;
    fileName: string;
    params: InsomniaRow[];
};

/** Whatever Insomnia wrote under `authentication`: the type names the scheme, the rest are its fields. */
export type InsomniaAuth = Record<string, unknown>;

/** The scripts of a request or a folder; a slot nobody wrote is empty. */
export type InsomniaScripts = { preRequest: string; afterResponse: string };

/** The switches of a request, on when nothing says otherwise, as Insomnia reads them. */
export type InsomniaRequestSettings = {
    /** `global`, `on` or `off`: `global` leaves it to the preferences of whoever sends. */
    followRedirects: string;
    encodeUrl: boolean;
    rebuildPath: boolean;
    renderRequestBody: boolean;
    sendCookies: boolean;
    storeCookies: boolean;
};

export type InsomniaRequest = {
    kind: 'request';
    name: string;
    method: string;
    url: string;
    description: string;
    headers: InsomniaRow[];
    parameters: InsomniaRow[];
    pathParameters: InsomniaRow[];
    body: InsomniaBody | undefined;
    authentication: InsomniaAuth | undefined;
    scripts: InsomniaScripts;
    settings: InsomniaRequestSettings;
};

export type InsomniaFolder = {
    kind: 'folder';
    name: string;
    description: string;
    headers: InsomniaRow[];
    authentication: InsomniaAuth | undefined;
    /** The variables of the folder, as the free JSON an environment keeps them in. */
    environment: Record<string, unknown>;
    scripts: InsomniaScripts;
    children: InsomniaNode[];
};

/** A WebSocket request: the address it dials, what it sends in the handshake and who it is. */
export type InsomniaWebSocket = {
    kind: 'websocket';
    name: string;
    url: string;
    description: string;
    headers: InsomniaRow[];
    parameters: InsomniaRow[];
    pathParameters: InsomniaRow[];
    authentication: InsomniaAuth | undefined;
};

export type InsomniaNode = InsomniaFolder | InsomniaRequest | InsomniaWebSocket;

/** An environment: its name and the variables it holds, as the free JSON Insomnia keeps them. */
export type InsomniaEnvironment = { name: string; data: Record<string, unknown> };

/** A thing of the export that is not an HTTP request, named so the import can say it left it out. */
export type InsomniaSkipped = { kind: string; name: string };

/**
 * A collection of Insomnia, whichever layout it came in: v4 rebuilds this from a flat list and
 * v5 reads it from the tree it already is.
 */
export type InsomniaDocument = {
    sourceId: string;
    name: string;
    description: string;
    children: InsomniaNode[];
    /** The environment every other one inherits from. */
    base: InsomniaEnvironment | undefined;
    environments: InsomniaEnvironment[];
    skipped: InsomniaSkipped[];
};
