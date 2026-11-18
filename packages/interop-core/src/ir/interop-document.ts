import type { Degradation } from '../resource/degradation.js';
import type {
    AuthConfig,
    ImportedScriptEvent,
    MessagePayloadType,
    ResponseCookie,
    ScriptDialect,
} from '@mandor/schema';

/**
 * What a document describes, said in words Mandor owns and no format does. Every importer of
 * every standard produces one of these, and everything downstream — the plan, the apply — reads
 * it without knowing which standard it came from.
 *
 * The document talks about the application it describes. Turning its voice into Mandor's is the
 * mapper's job, and by the time an operation is here, `direction` already means this side of the
 * wire: `outgoing` is something Mandor sends, `incoming` is something Mandor expects to receive.
 */
export type InteropDocument = {
    /** What the service calls itself, as the import will want to name what it creates. */
    name: string;
    /** What the document says of itself. Absent: it says nothing, or the format has no such thing. */
    description?: string | undefined;
    /** Stable for the same source document across imports; it is what makes a re-import an update. */
    sourceId: string;
    /** One entry per endpoint the document offers. A workspace gets one connection per entry. */
    servers: InteropServer[];
    /** The named security the document declares; servers and operations point at it by name. */
    security: Record<string, InteropSecurityScheme>;
    /** The addresses the traffic travels. Each one becomes a folder of the collection. */
    channels: InteropChannel[];
    /** One entry per operation the document declares, carrying its message when it has one. */
    operations: InteropOperation[];
    /** The security the document asks of every operation that does not say otherwise. */
    defaultSecurity: string[];
    /** The payload schemas the document declares by name; messages point at them by name too. */
    payloadSchemas: Record<string, InteropPayloadSchema>;
    /**
     * What the document as a whole says about itself the import wants the user to read: a
     * conversion it made, a section it kept loose. One line each, in the format's own words. A
     * note is not a loss of one resource — that is a degradation, and it blocks the row.
     */
    notes: Degradation[];
    /** Everything else the document carried, kept because dropping it would drop someone's work. */
    extras: Record<string, unknown>;
    /** Variables of the document as a whole. Absent: the format has no such thing. */
    variables?: InteropVariable[] | undefined;
    /** Environments the document is or brings. Absent: the format has none. */
    environments?: InteropEnvironment[] | undefined;
    /**
     * Folders of the document's own tree, parents first. Absent: folders come from a tag or a
     * channel, as the format has no tree of its own.
     */
    groups?: InteropGroup[] | undefined;
    /**
     * How the groups and the operations mix as the document lists them, parents first. Absent: the
     * groups come first.
     */
    sequence?: ('folder' | 'item')[] | undefined;
    /** Scripts of the document as a whole. */
    scripts?: InteropScript[] | undefined;
};

/** A variable as the document wrote it. The name is not checked here: the mapper decides what Mandor can hold. */
export type InteropVariable = {
    name: string;
    value: string;
    enabled: boolean;
    secret: boolean;
};

export type InteropEnvironment = {
    name: string;
    variables: InteropVariable[];
    extras: Record<string, unknown>;
};

/** A script as the document wrote it. Nothing runs it: see `ImportedScript` in `@mandor/schema`. */
export type InteropScript = {
    event: ImportedScriptEvent;
    dialect: ScriptDialect;
    source: string;
    enabled: boolean;
};

/** A folder of the document's own tree, rather than one derived from a tag or a channel. */
export type InteropGroup = {
    /** Names from the top down, its own last. Unique within the document. */
    path: string[];
    description?: string | undefined;
    /** Variables the group declares. Absent: the format has none at this level. */
    variables?: InteropVariable[] | undefined;
    /** null = inherits from the group above; [] = no auth. */
    security: string[] | null;
    scripts: InteropScript[];
    extras: Record<string, unknown>;
};

/** The two sides of the wire, already told from Mandor's point of view. */
export const INTEROP_DIRECTIONS = ['outgoing', 'incoming'] as const;

export type InteropDirection = (typeof INTEROP_DIRECTIONS)[number];

export type InteropServer = {
    /** Unique within the document, because operations point at servers by name. */
    name: string;
    /** As the document states it. What `{{var}}` it carries resolves against the workspace, later. */
    url: string;
    /** What the document says speaks at this endpoint. The mapper chooses the transport it maps to. */
    protocol: string;
    /** Names of security schemes this endpoint asks for. Values are never carried here. */
    security: string[];
    /** The `{name}` placeholders of the url, each with the value it takes when nobody says otherwise. */
    variables: Record<string, InteropServerVariable>;
    extras: Record<string, unknown>;
};

export type InteropServerVariable = {
    default: string;
    enum?: string[] | undefined;
    description?: string | undefined;
};

export type InteropSecurityScheme = {
    /** What the document calls it, kept as written: the mapper is who knows what Mandor can do with it. */
    type: string;
    extras: Record<string, unknown>;
};

export type InteropChannel = {
    /** Unique within the document, because operations point at channels by name. */
    name: string;
    /** What the wire calls this address: the topic, the event, the path. */
    address: string;
    /** What the document says this channel is for, kept for the item that describes itself. */
    description?: string | undefined;
    extras: Record<string, unknown>;
};

export type InteropOperation = {
    /** Unique within the document; it becomes the name of the item the import writes. */
    name: string;
    /** The name of the channel this operation travels. */
    channel: string;
    /** Already told from Mandor's side. The flip from the document's voice happened in the mapper. */
    direction: InteropDirection;
    /** The message the operation carries. Absent when the document describes the address alone. */
    message?: InteropMessage | undefined;
    /** Names of security schemes using this operation asks for. */
    security: string[];
    /** What a request/response operation says beyond a message: method, path, parameters. */
    http?: InteropHttpOperation | undefined;
    /** The folder of the first level a message hangs from, when a workspace says it. */
    group?: string | undefined;
    /** What a workspace labels the message with, beyond the folder it hangs from. */
    tags?: string[] | undefined;
    extras: Record<string, unknown>;
};

/** An operation of a document that speaks request and response, as the item that sends it needs it. */
export type InteropHttpOperation = {
    /** Uppercase. */
    method: string;
    /** As the document writes it, `{name}` placeholders included: `/pets/{petId}`. */
    path: string;
    summary?: string | undefined;
    description?: string | undefined;
    tags: string[];
    parameters: InteropParameter[];
    requestBody?: InteropRequestBody | undefined;
    responses: InteropResponseExample[];
    /** Null inherits the document default; an empty list means no auth at all. */
    security: string[] | null;
    /** The whole address as the document wrote it, with no query. Absent: `path` over a server. */
    url?: string | undefined;
    /** The path of the group this request sits in. Absent: the root. */
    group?: string[] | undefined;
    scripts?: InteropScript[] | undefined;
};

export const INTEROP_PARAMETER_PLACES = ['query', 'header', 'path', 'cookie'] as const;

export type InteropParameterPlace = (typeof INTEROP_PARAMETER_PLACES)[number];

export type InteropParameter = {
    name: string;
    in: InteropParameterPlace;
    required: boolean;
    /** The value the item starts with, already told as text. */
    value: string;
    /** The JSON Schema of the parameter as text, when the document gives one. */
    schema?: string | undefined;
    /** Absent: the same as `required`, the rule an OpenAPI import has always followed. */
    enabled?: boolean | undefined;
};

export type InteropRequestBody = {
    contentType: string;
    /** The sample the item starts with, already told as text. */
    value: string;
    /** The JSON Schema of the body as text, when the document gives one. */
    schema?: string | undefined;
    required: boolean;
    /** The rows of a `form` or `urlencoded` body. */
    fields?: InteropBodyField[] | undefined;
    /** The variables of a GraphQL body, as text. */
    variables?: string | undefined;
};

export type InteropBodyField = {
    key: string;
    /** For a file row, the path as the document wrote it. */
    value: string;
    enabled: boolean;
    kind: 'text' | 'file';
    contentType?: string | undefined;
};

/** The request a response was saved with, in the same words as the request it hangs from. */
export type InteropExampleRequest = {
    parameters: InteropParameter[];
    requestBody?: InteropRequestBody | undefined;
    /** Absent: the auth of the request it hangs from. */
    auth?: AuthConfig | undefined;
    description?: string | undefined;
};

/** A response the document shows, kept beside the request it answers. Nothing is invented. */
export type InteropResponseExample = {
    name: string;
    status: string;
    contentType: string;
    body: string;
    /** The JSON Schema text the answer keeps. Absent when nobody wrote one. */
    schema?: string | undefined;
    headers?: [string, string][] | undefined;
    cookies?: ResponseCookie[] | undefined;
    sentWith?: InteropExampleRequest | undefined;
};

export type InteropMessage = {
    name?: string | undefined;
    /** What gets sent, kept as written: `{{var}}` travels as a template and resolves on the way out. */
    payload?: string | undefined;
    /** How the payload is meant to be read. Absent until the mapper can say it with certainty. */
    payloadType?: MessagePayloadType | undefined;
    /** The name of the payload schema this payload promises to meet, in `payloadSchemas`. */
    payloadSchema?: string | undefined;
    /** The headers the message carries, as written. */
    headers?: Record<string, string> | undefined;
    /** Sample payloads the document shipped, kept as written: they are examples, not defaults. */
    examples: string[];
    extras: Record<string, unknown>;
};

export type InteropPayloadSchema = {
    /** The schema exactly as the document wrote it. The text is the contract, and it travels as text. */
    text: string;
    extras: Record<string, unknown>;
};
