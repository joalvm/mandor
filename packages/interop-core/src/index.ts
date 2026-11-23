// The only barrel in the package. It states the public API and nothing else: inside the
// package every module imports the file that defines the symbol.

export {
    INTEROP_PARAMETER_PLACES,
    type InteropChannel,
    type InteropDirection,
    type InteropBodyField,
    type InteropDocument,
    type InteropGroup,
    type InteropHttpOperation,
    type InteropMessage,
    type InteropOperation,
    type InteropExampleRequest,
    type InteropParameter,
    type InteropParameterPlace,
    type InteropPayloadSchema,
    type InteropRequestBody,
    type InteropResponseExample,
    type InteropSecurityScheme,
    type InteropServer,
    type InteropScript,
    type InteropServerVariable,
    type InteropVariable,
} from './ir/interop-document.js';
export { chooseByKey, type KeyHandlers } from './choose/choose-by-key.js';
export { binaryBodyOf, fileRowOf } from './import/file-body-of.js';
export { formBodyOf, type BodyMapping, type FormRow } from './import/form-body-of.js';
export { type VariablePlace, variablesOf } from './import/variables-of.js';
export { ownScriptsOf } from './import/own-scripts-of.js';
export {
    checkedAuth,
    loopbackPortOf,
    optionalField,
    type AuthDraft,
    type AuthResult,
    type AuthSubject,
} from './import/auth-draft.js';
export { claimRoute, slugFor, type TakenRoutes } from './import/claim-route.js';
export { claimStem } from './export/claim-stem.js';
export { clientCredentialsDraft, codeFlowDraft } from './import/oauth2-drafts.js';
export { environmentResources } from './import/environment-resources.js';
export { socketResources } from './import/socket-resources.js';
export { treeResourcesOf, type TreeMakers, type TreeWalk } from './import/tree-resources.js';
export { collectionsToWrite } from './workspace/collections-to-write.js';
export { colonPathOf } from './export/colon-path-of.js';
export { concreteAuthOf } from './export/concrete-auth-of.js';
export { listedRows } from './export/listed-rows.js';
export { namedRowsOf } from './export/named-rows-of.js';
export { variablesOverGlobals } from './export/variables-over-globals.js';
export { SUBPROTOCOL_HEADER, websocketHeaderRows } from './export/websocket-header-rows.js';
export { loopbackRedirectOf } from './export/loopback-redirect-of.js';
export { withoutEmpty } from './export/without-empty.js';
export { pathParamsOf } from './import/path-params-of.js';
export { namedApart } from './import/named-apart.js';
export { websocketConnectionOf } from './import/websocket-connection.js';
export {
    definedOnly,
    distinct,
    type LevelSettings,
    listOrNone,
    nameOr,
    textOf,
} from './import/resource-parts.js';
export { urlProtocolOf } from './ir/url-protocol.js';
export { documentRootOf } from './format/document-root.js';
export { documentYamlOf } from './format/document-yaml.js';
export { irDiff } from './ir/ir-diff.js';
export { isRecord } from './ir/is-record.js';
export { FormatInputError } from './format/format-input-error.js';
export { ImportOtherAppError } from './format/import-other-app-error.js';
export type {
    FormatDocument,
    FormatFile,
    InteropCodec,
    InteropFile,
    InteropFormat,
    InteropRead,
} from './format/interop-format.js';
export { INTEROP_SCOPES, type InteropScope } from './scope/interop-scope.js';
export { resourcesInScope } from './scope/resources-in-scope.js';
export { INTEROP_INPUTS, type InteropInput } from './format/interop-input.js';
export { readSoleDocument } from './format/read-sole-document.js';
export { soleFileOf, sniffSoleFile } from './format/sole-file.js';
export { childrenInOrder, inSequence } from './workspace/children-in-order.js';
export { workspaceToIr } from './workspace/workspace-to-interop.js';
export { selectWorkspaceData } from './workspace/select-workspace-data.js';
export { workspaceDataInScope } from './workspace/workspace-data-in-scope.js';
export { type OutlineKind, type OutlineLoss } from './workspace/outline-kind.js';
export { type UnkeptParts } from './workspace/unkept-parts.js';
export {
    outlineNodeSchema,
    workspaceOutline,
    type OutlineNode,
} from './workspace/workspace-outline.js';
export {
    type WorkspaceCollectionSource,
    type WorkspaceData,
    type WorkspaceDoc,
    type WorkspaceFolderNode,
    type WorkspaceFolderSettings,
} from './workspace/workspace-data.js';
export { interopDocumentSchema } from './ir/interop-document-schema.js';
export { interopHttpOperationSchema } from './ir/interop-http-schema.js';

export type { AppliedResource } from './resource/applied-resource.js';
export type { ExistingResource } from './resource/existing-resource.js';
export type { ImportResource } from './resource/import-resource.js';
export { importResourceSchema } from './resource/import-resource-schema.js';
export { type ResourcePlace } from './resource/resource-place.js';
export { type StorableKind } from './resource/storable-kind.js';
export { collectionResourceOf, underCollection } from './resource/collection-resource.js';
export {
    DEGRADATION_CODES,
    degradation,
    degradationSchema,
    type Degradation,
    type DegradationCode,
} from './resource/degradation.js';
export { withDocumentNotes } from './resource/with-document-notes.js';

export { fingerprintOf } from './plan/fingerprint-of.js';
export { collectionFingerprint, folderFingerprint } from './resource/collection-fingerprint.js';
export { environmentFingerprint } from './resource/environment-fingerprint.js';
export { workspaceFingerprint } from './resource/workspace-fingerprint.js';
export {
    importPlan,
    type ImportPlan,
    type ImportPlanEntry,
    type ImportPlanEntryClass,
} from './plan/import-plan.js';
export { leaveOutUnstored, type FolderSetting } from './plan/leave-out-unstored.js';
export { importPlanSchema } from './plan/import-plan-schema.js';
