// The only barrel in the package. It states the public API and nothing else:
// inside the package every module imports the file that defines the symbol.

export type { ApiKeyPlacement } from './auth/api-key-placement.js';
export type {
    ApiKeyAuth,
    AuthConfig,
    AwsSigV4Auth,
    BasicAuth,
    BearerAuth,
    ConcreteAuth,
    DigestAuth,
    OAuth2ClientCredentials,
    OAuth2CodePkce,
} from './auth/auth-config.js';
export type { AuthChainLevel } from './auth/auth-chain-level.js';
export { authChainOf } from './auth/auth-chain-of.js';
export { authChainLevelSchema } from './auth/auth-chain-level-schema.js';
export {
    authConfigSchema,
    concreteAuthSchema,
    redirectPortSchema,
} from './auth/auth-config-schema.js';
export type { AuthPlace } from './auth/auth-place.js';

export {
    DEFAULT_NETWORK_SETTINGS,
    HOST_PATTERN,
    networkSettingsSchema,
    PROXY_MODES,
    type ClientCertificate,
    type NetworkSettings,
    type ProxyMode,
    type ProxySettings,
} from './network/network-settings.js';

export { collectionItemPaths } from './collection/collection-item-paths.js';
export { type CollectionPlace, collectionPlace, childPath } from './collection/collection-place.js';
export {
    collectionParentSchema,
    collectionPathSchema,
} from './collection/collection-path-schema.js';
export { collectionsFileSchema } from './collection/collections-file-schema.js';
export { collectionItemFields } from './collection/collection-item-fields.js';
export { collectionItemMark } from './collection/collection-item-mark.js';
export { collectionItemExamples } from './collection/collection-item-examples.js';
export {
    collectionItemEnvelopeSchema,
    type CollectionItemFields,
} from './collection/collection-item-envelope-schema.js';
export type { CollectionItem } from './collection/collection-item.js';
export type {
    CollectionFolderNode,
    CollectionItemExample,
    CollectionItemNode,
    CollectionNode,
    CollectionSetNode,
} from './collection/collection-node.js';
export { collectionNodeSchema } from './collection/collection-node-schema.js';
export type { CollectionsFile } from './collection/collections-file.js';
export type { FolderChainLevel, FolderChainSettings } from './collection/folder-chain-level.js';
export { folderChainLevelSchema } from './collection/folder-chain-level-schema.js';
export { folderSettingsSchema } from './collection/folder-settings-schema.js';
export { itemParentOf } from './collection/item-parent.js';
export type { FolderSettings } from './collection/folder-settings.js';
export {
    type HeaderInheritance,
    type HeaderOverride,
    type InheritedHeader,
    inheritedHeaders,
} from './collection/inherited-headers.js';
export { parseFolderSettings } from './collection/parse-folder-settings.js';
export { itemOriginSchema } from './collection/item-origin-schema.js';
export { type ItemOrigin, type ItemOriginKind } from './collection/item-origin.js';
export { parseCollectionItem } from './collection/parse-collection-item.js';
export { parseCollectionsFile } from './collection/parse-collections-file.js';
export { reconciledOrder } from './collection/reconciled-order.js';

export { workspaceBundleSchema, type WorkspaceBundle } from './bundle/workspace-bundle-schema.js';

export { createConnection, type CreateConnectionInput } from './connection/create-connection.js';
export { connectionFieldsSchema, connectionSchema } from './connection/connection-schema.js';
export { connectionExtrasOf } from './connection/connection-extras.js';
export { parseConnection } from './connection/parse-connection.js';
export type { Connection } from './connection/connection.js';
export {
    CONNECTION_TRANSPORTS,
    DEFAULT_CONNECTION_TRANSPORT,
    type ConnectionTransport,
} from './connection/connection-transport.js';
export { connectionUrlSchema, urlMatchesTransport } from './connection/connection-url-schema.js';
export { urlForTransport } from './connection/url-for-transport.js';
export { connectionTransportSchema } from './connection/connection-transport-schema.js';
export {
    DEFAULT_HANDSHAKE_OPTIONS,
    handshakeOptionsSchema,
} from './connection/handshake-options.js';
export {
    DEFAULT_KEEPALIVE_OPTIONS,
    keepaliveOptionsSchema,
} from './connection/keepalive-options.js';
export { DEFAULT_RETRY_OPTIONS, retryOptionsSchema } from './connection/retry-options.js';
export {
    DEFAULT_SOCKETIO_OPTIONS,
    SOCKETIO_ENGINE_TRANSPORTS,
    SOCKETIO_VERSIONS,
    socketIoOptionsSchema,
    type SocketIoEngineTransport,
    type SocketIoVersion,
} from './connection/socketio-options.js';
export {
    DEFAULT_WEBSOCKET_OPTIONS,
    SUBPROTOCOL_PATTERN,
    websocketOptionsSchema,
} from './connection/websocket-options.js';
export { applyFrameTemplate, parseFrameTemplate } from './connection/frame-template.js';

export { assertDocName, isDocName } from './doc/doc-name.js';
export { docNameSchema } from './doc/doc-name-schema.js';
export { docFileName, docTitle } from './doc/doc-title.js';

export { createEnvironment } from './environment/create-environment.js';
export { environmentSchema } from './environment/environment-schema.js';
export type { Environment } from './environment/environment.js';
export { parseEnvironment } from './environment/parse-environment.js';
export { variableNameSchema } from './environment/variable-name-schema.js';
export { variableSchema } from './environment/variable-schema.js';
export type { Variable } from './environment/variable.js';

export { entityNameSchema } from './fields/entity-name-schema.js';
export { slugSchema } from './fields/slug-schema.js';

export { FormatError } from './format/format-error.js';
export { FormatVersionError } from './format/format-version-error.js';
export { BUNDLE_FORMAT } from './bundle/bundle-format.js';
export { type Globals, globalsSchema, parseGlobals } from './globals/globals-schema.js';
export { REPO_FORMAT } from './repo/repo-format.js';

export { IdError } from './id/id-error.js';
export { assertSegment, segmentsOf } from './id/path-id.js';
export { SEGMENT } from './id/segment-pattern.js';
export { freeName } from './id/free-name.js';
export { newId } from './id/new-id.js';
export { slugify } from './id/slugify.js';

export { createMessageItem } from './message/create-message-item.js';
export { messageItemBody } from './message/message-item-body.js';
export { MESSAGE_ITEM_KIND } from './message/message-item-kind.js';
export type { MessageItem } from './message/message-item.js';
export {
    MESSAGE_PAYLOAD_TYPES,
    parseMessagePayloadType,
    type MessagePayloadType,
} from './message/message-payload-type.js';
export { parseMessageItem } from './message/parse-message-item.js';

export { bodyFilePathSchema } from './request/body-file-path-schema.js';
export { createRequestItem } from './request/create-request-item.js';
export { requestItemBody } from './request/request-item-body.js';
export { REQUEST_ITEM_KIND } from './request/request-item-kind.js';
export { curlCommandFrom } from './request/curl-command.js';
export { type CurlInvalidReason, type CurlNotice } from './request/curl-notice.js';
export {
    curlParseSchema,
    curlSettingsSchema,
    type CurlParse,
    type CurlRequest,
} from './request/curl-parse.js';
export {
    SNIPPET_TARGETS,
    snippetTargetSchema,
    type SnippetTarget,
} from './request/snippet-target.js';
export {
    requestItemSchema,
    requestLineSchema,
    requestSettingsSchema,
} from './request/request-item-schema.js';
export type { RequestItem } from './request/request-item.js';
export type { RequestBody, RequestBodyOf, RequestFormField } from './request/request-body.js';
export { bodyContentType } from './request/body-content-type.js';
export { SEND_DEFAULT_HEADERS, withSendDefaults } from './request/send-default-headers.js';
export { REQUEST_BODY_TYPES, type RequestBodyType } from './request/request-body-type.js';
export { METHOD_PATTERN, STANDARD_METHODS } from './request/request-methods.js';
export { KEY_VALUE_TYPES, type KeyValueMeta } from './request/request-line-meta.js';
export { parseRequestItem } from './request/parse-request-item.js';
export type { RequestExample, RequestExampleOverrides } from './request/request-example.js';
export {
    EXAMPLE_OVERRIDE_KEYS,
    exampleOverrides,
    exampleRequest,
} from './request/example-request.js';
export {
    exampleKey,
    exampleKeys,
    examplesApart,
    uniqueExampleName,
} from './request/example-keys.js';
export type { RequestLine } from './request/request-line.js';
export {
    DEFAULT_REQUEST_SETTINGS,
    effectiveRequestSettings,
    HTTP_VERSIONS,
    TLS_VERSIONS,
} from './request/request-settings.js';
export type {
    HttpVersion,
    TlsVersion,
    RequestSettings,
    RequestSettingsOverrides,
} from './request/request-settings.js';

export {
    graphqlSchemaCacheSchema,
    type GraphqlSchemaCache,
} from './graphql/graphql-schema-cache.js';
export { conflictRecordSchema, type ConflictRecord } from './conflict/conflict-record.js';
export { historyEntrySchema } from './history/history-entry-schema.js';
export type { HistoryEntry } from './history/history-entry.js';
export {
    historySummaryOf,
    historySummarySchema,
    type HistorySummary,
} from './history/history-summary.js';

export {
    httpResponseSchema,
    responseCookieSchema,
    type HttpResponse,
    type ResponseCookie,
} from './response/http-response.js';
export { type ResponseBody } from './response/response-body.js';

export { importedScriptSchema } from './script/imported-script-schema.js';
export {
    IMPORTED_SCRIPT_EVENTS,
    type ImportedScript,
    type ImportedScriptEvent,
    SCRIPT_DIALECTS,
    type ScriptDialect,
} from './script/imported-script.js';
export { connectionScriptsSchema, requestScriptsSchema } from './script/own-scripts-schema.js';
export {
    CONNECTION_SCRIPT_EVENTS,
    type ConnectionScriptEvent,
    type ConnectionScripts,
    hasOwnScripts,
    ownScriptsOrNothing,
    REQUEST_SCRIPT_EVENTS,
    type RequestScriptEvent,
    type RequestScripts,
    SCRIPT_EVENTS,
    SCRIPT_LEVELS,
    type ScriptEntry,
    type ScriptLevel,
} from './script/own-scripts.js';
export {
    chainLogSchema,
    scriptErrorSchema,
    scriptLogSchema,
    scriptNotice,
    scriptNoticeSchema,
    scriptTestSchema,
    skippedScriptSchema,
    type ChainLog,
    type ScriptError,
    type ScriptLog,
    type ScriptNotice,
    type ScriptTest,
    type SkippedScript,
} from './script/script-output.js';

export type { PreferenceDefinition } from './preference/preference-definition.js';
export { PREFERENCE_DEFINITIONS } from './preference/preference-definitions.js';
export { THEME_IDS, type ThemeId } from './preference/theme-id.js';
export {
    resolvePreferenceValues,
    type PreferenceKey,
    type PreferenceValues,
    type ResolvedPreferenceValues,
} from './preference/preference-values.js';

export { createLocalOrigin, createOrigin } from './origin/create-origin.js';
export { LOCAL_ORIGIN_ID, type Origin, type OriginKind } from './origin/origin.js';
export { originHostOf, type OriginHost } from './origin/origin-host.js';
export { originSchema } from './origin/origin-schema.js';
export {
    ORIGIN_SYNC_STATES,
    originSyncStateSchema,
    type OriginSyncState,
    type OriginSyncStateName,
} from './origin/origin-sync-state.js';
export { OriginUrlError } from './origin/origin-url-error.js';
export { isOriginUrl, splitOriginUrl } from './origin/origin-url.js';

export { formatResourceUri } from './resource/format-resource-uri.js';
export { parseResourceUri } from './resource/parse-resource-uri.js';
export { resourceUriSchema } from './resource/resource-uri-schema.js';
export { RESOURCE_URI_SCHEME } from './resource/resource-uri-syntax.js';
export type { ResourceUri, ResourceUriParts } from './resource/resource-uri.js';

export { changedEntitySchema, type ChangedEntity } from './repo/changed-entity.js';
export { createRepo } from './repo/create-repo.js';
export { parseRepo } from './repo/parse-repo.js';
export { repoSchema } from './repo/repo-schema.js';
export type { Repo } from './repo/repo.js';

export { createWorkspace, type CreateWorkspaceInput } from './workspace/create-workspace.js';
export { parseWorkspace } from './workspace/parse-workspace.js';
export { workspaceSchema } from './workspace/workspace-schema.js';
export { plainVariableSchema, type PlainVariable } from './environment/plain-variable-schema.js';
export {
    type BaseOf,
    spreadIntoEnvironments,
    type SpreadVariables,
} from './environment/spread-into-environments.js';
export { byName } from './fields/by-name.js';
export { effectiveEnvironment } from './workspace/effective-environment.js';
export type { Workspace } from './workspace/workspace.js';
export type { WorkspaceKind } from './workspace/workspace-kinds.js';
