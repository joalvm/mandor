// The only barrel in the package. It states the public API and nothing else: inside the
// package every module imports the file that defines the symbol.

export { type CoreBridge, type Unsubscribe } from './bridge/core-bridge.js';

export { CHANNELS, type Channel } from './channel/channels.js';

export { authReadRequestSchema, type PlaceAuth, authReadResultSchema } from './auth/auth-read.js';
export { authWriteRequestSchema } from './auth/auth-write.js';
export {
    authTokenRequestSchema,
    type AuthTokenRequest,
    type AuthTokenStatus,
    authTokenStatusResultSchema,
} from './auth/auth-token-status.js';

export {
    type GlobalsReadRequest,
    globalsReadRequestSchema,
    globalsReadResultSchema,
    type GlobalsWriteRequest,
    globalsWriteRequestSchema,
    globalsWriteResultSchema,
} from './globals/globals-contract.js';
export {
    type CollectionSettingsWriteRequest,
    collectionSettingsWriteRequestSchema,
    type FolderSettingsWindowPatch,
    folderSettingsPatchSchema,
} from './collection/collection-settings-write.js';
export {
    type CollectionChainRequest,
    collectionChainRequestSchema,
    collectionChainResultSchema,
} from './collection/collection-chain.js';
export {
    collectionCreateRequestSchema,
    collectionCreateResultSchema,
} from './collection/collection-create.js';
export { collectionDeleteRequestSchema } from './collection/collection-delete.js';
export { collectionMoveRequestSchema } from './collection/collection-move.js';
export {
    collectionReadItemRequestSchema,
    collectionReadItemResultSchema,
} from './collection/collection-read-item.js';
export { collectionWriteItemRequestSchema } from './collection/collection-write-item.js';
export { collectionRenameRequestSchema } from './collection/collection-rename.js';
export { collectionReorderRequestSchema } from './collection/collection-reorder.js';
export {
    collectionTreeRequestSchema,
    collectionTreeResultSchema,
} from './collection/collection-tree.js';
export {
    collectionSearchRequestSchema,
    collectionSearchResultSchema,
    type CollectionSearchHit,
} from './collection/collection-search.js';

export type { ConnectionArea } from './connection/connection-area.js';
export {
    connectionCreateRequestSchema,
    type ConnectionCreateRequest,
    connectionCreateResultSchema,
} from './connection/connection-create.js';
export { connectionDeleteRequestSchema } from './connection/connection-delete.js';
export {
    connectionListRequestSchema,
    connectionListResultSchema,
} from './connection/connection-list.js';
export {
    connectionUpdateRequestSchema,
    type ConnectionChanges,
    connectionUpdateResultSchema,
} from './connection/connection-update.js';

export { docCreateRequestSchema, docCreateResultSchema } from './doc/doc-create.js';
export { docDeleteRequestSchema } from './doc/doc-delete.js';
export { docListRequestSchema, docListResultSchema, type ListedDoc } from './doc/doc-list.js';
export { docReadRequestSchema, docReadResultSchema } from './doc/doc-read.js';
export { docRenameRequestSchema } from './doc/doc-rename.js';
export { docRevertRequestSchema, docRevertResultSchema } from './doc/doc-revert.js';
export { docWriteRequestSchema } from './doc/doc-write.js';

export {
    activeEnvironmentsSchema,
    environmentActiveLoadRequestSchema,
    environmentActiveLoadResultSchema,
    type ActiveEnvironments,
} from './environment/environment-active-load.js';
export { environmentActiveSaveRequestSchema } from './environment/environment-active-save.js';
export {
    type EnvironmentDefaultLoadRequest,
    environmentDefaultLoadRequestSchema,
    environmentDefaultResultSchema,
    type EnvironmentDefaultSaveRequest,
    environmentDefaultSaveRequestSchema,
    environmentDefaultSaveResultSchema,
} from './environment/environment-default.js';
export {
    environmentCreateRequestSchema,
    environmentCreateResultSchema,
} from './environment/environment-create.js';
export { environmentDeleteRequestSchema } from './environment/environment-delete.js';
export {
    environmentListRequestSchema,
    environmentListResultSchema,
} from './environment/environment-list.js';
export {
    environmentUpdateRequestSchema,
    environmentUpdateResultSchema,
    type EnvironmentChanges,
} from './environment/environment-update.js';

export { exportJsonlRequestSchema, exportJsonlResultSchema } from './export/export-jsonl.js';
export type { ExportRecord, ExportedFile, JsonlExportArea } from './export/export-jsonl.js';
export { exportOutlineRequestSchema, exportOutlineResultSchema } from './export/export-outline.js';
export { exportWriteRequestSchema, exportWriteResultSchema } from './export/export-write.js';

export {
    importApplyRequestSchema,
    type ImportApplyRequest,
    type ImportApplied,
    type ImportTarget,
    importApplyResultSchema,
} from './import/import-apply.js';
export { type ImportFile } from './import/import-file.js';
export {
    IMPORT_PROGRESS_EVERY,
    importProgressPushSchema,
    type ImportProgressPush,
} from './import/import-progress.js';
export {
    importPickRequestSchema,
    type ImportPicked,
    importPickResultSchema,
} from './import/import-pick.js';
export {
    importPlanBuildRequestSchema,
    type ImportPlanBuildRequest,
    type ImportPlanBuilt,
    importPlanBuildResultSchema,
} from './import/import-plan-build.js';
export type { ImportPlan } from '@mandor/interop-core';

export { type OpenedOrigin } from './origin/opened-origin.js';
export {
    originAddRequestSchema,
    originAddResultSchema,
    type OriginAddRequest,
} from './origin/origin-add.js';
export {
    originCheckRequestSchema,
    originCheckResultSchema,
    type OriginCheck,
} from './origin/origin-check.js';
export { originEmptyRequestSchema } from './origin/origin-empty.js';
export { originRemoveRequestSchema } from './origin/origin-remove.js';
export {
    originRenameRequestSchema,
    originRenameResultSchema,
    type OriginRenameRequest,
} from './origin/origin-rename.js';
export { originStatePushSchema, originStateResultSchema } from './origin/origin-state.js';
export { originListResultSchema } from './origin/origin-list.js';
export { originSwitchRequestSchema, originSwitchResultSchema } from './origin/origin-switch.js';

export { errorCodeSchema, type ErrorCode } from './result/error-code.js';
export { failure } from './result/failure.js';
export type { Empty, Err, Result } from './result/result.js';
export { emptyResultSchema } from './result/result-schema.js';
export { success } from './result/success.js';

export { secretClearRequestSchema } from './secret/secret-clear.js';
export { secretKeptRequestSchema, secretKeptResultSchema } from './secret/secret-kept.js';
export {
    secretRevealRequestSchema,
    secretRevealResultSchema,
    type RevealedSecret,
} from './secret/secret-reveal.js';
export { secretSetRequestSchema } from './secret/secret-set.js';

export { sessionLoadRequestSchema, sessionLoadResultSchema } from './session/session-load.js';
export { sessionSaveRequestSchema } from './session/session-save.js';
export { menuEditPushSchema, type MenuEditPush } from './menu/menu-edit.js';
export { menuLanguageRequestSchema } from './menu/menu-language.js';
export {
    type GridAxis,
    type GridBranch,
    type GridLeaf,
    type GridNode,
} from './session/grid-node.js';
export { leavesOf } from './session/grid-leaves.js';
export { restoredUiSessionSchema } from './session/restored-ui-session.js';
export { SIDEBAR_WIDTH } from './session/session-panels.js';
export { type SessionTab } from './session/session-tab.js';
export {
    EMPTY_UI_SESSION,
    ROOT_GROUP_ID,
    uiSessionSchema,
    type UiSession,
} from './session/ui-session.js';

export {
    workspaceCreateRequestSchema,
    workspaceCreateResultSchema,
} from './workspace/workspace-create.js';
export { workspaceDeleteRequestSchema } from './workspace/workspace-delete.js';
export {
    workspaceListRequestSchema,
    type ListedWorkspace,
    workspaceListResultSchema,
} from './workspace/workspace-list.js';
export {
    workspaceRenameRequestSchema,
    workspaceRenameResultSchema,
} from './workspace/workspace-rename.js';

export { appRelaunchRequestSchema } from './window/app-relaunch.js';
export {
    appAboutRequestSchema,
    appAboutResultSchema,
    appAboutSchema,
    type AppAbout,
} from './app/app-about.js';
export { appOpenLicensesRequestSchema } from './app/app-open-licenses.js';
export {
    APPEARANCE_SOURCES,
    appearanceConfigureRequestSchema,
    type AppearanceConfigureRequest,
    type AppearanceSource,
} from './appearance/appearance-configure.js';
export { menuSettingsPushSchema } from './menu/menu-settings.js';
export { windowReadyRequestSchema } from './window/window-ready.js';
export { windowCloseRequestSchema } from './window/window-close.js';
export { conflictRecordedPushSchema, repoChangedPushSchema } from './repo/repo-changed.js';
export {
    networkChooseFileRequestSchema,
    networkChooseFileResultSchema,
    networkSecretRequestSchema,
    type NetworkFilePurpose,
    type NetworkSecretRequest,
} from './network/network-secret.js';
export {
    networkReadResultSchema,
    networkWriteRequestSchema,
    type NetworkState,
} from './network/network-state.js';
export {
    SCRIPTS_STATUS_MAX,
    scriptsApproveRequestSchema,
    scriptsApproveResultSchema,
    scriptsClearVariablesRequestSchema,
    scriptsForgetRequestSchema,
    scriptsStatusRequestSchema,
    scriptsStatusResultSchema,
    scriptsSwitchReadResultSchema,
    scriptsSwitchWriteRequestSchema,
    type ScriptsApproveRequest,
    type ScriptsStatusRequest,
    type ScriptStatus,
    type ScriptsSwitchState,
} from './script/scripts-approval.js';
export {
    updateConfigureRequestSchema,
    type UpdateChannel,
    type UpdateConfigureRequest,
} from './update/update-configure.js';
export {
    UPDATE_NOTES_MAX,
    updateStateResultSchema,
    updateStateSchema,
    type UpdateNext,
    type UpdatePhase,
    type UpdateState,
    type UpdateSupport,
} from './update/update-state.js';
export {
    LOG_MESSAGE_MAX,
    LOG_STACK_MAX,
    logWriteRequestSchema,
    type LogSource,
    type LogWriteRequest,
} from './log/log-write.js';
export {
    noticeListResultSchema,
    noticePushSchema,
    type NoticeCode,
    type NoticeParam,
    type NoticePush,
} from './notice/notice-push.js';
export { conflictChangedPushSchema } from './conflict/conflict-changed.js';
export {
    conflictReadRequestSchema,
    conflictReadResultSchema,
    type ConflictDetail,
    type ConflictItem,
    type ConflictSide,
} from './conflict/conflict-detail.js';
export {
    conflictKeepMineRequestSchema,
    conflictResolveRequestSchema,
    type ConflictChoice,
} from './conflict/conflict-resolve.js';
export { conflictListResultSchema, type ConflictSummary } from './conflict/conflict-summary.js';
export { windowMaximizedPushSchema } from './window/window-maximized.js';
export { windowMinimizeRequestSchema } from './window/window-minimize.js';
export { windowPopupMenuRequestSchema } from './window/window-popup-menu.js';
export { windowToggleMaximizeRequestSchema } from './window/window-toggle-maximize.js';

export {
    ACTIVITY_WINDOW_BYTES,
    ACTIVITY_WINDOW_ENTRIES,
    wsActivityPushSchema,
    type ActivityRecord,
    type WsActivityPush,
} from './ws/ws-activity.js';
export type { WsArea } from './ws/ws-area.js';
export { wsCloseRequestSchema, type WsCloseRequest } from './ws/ws-close.js';
export { wsOpenRequestSchema, type WsOpenRequest } from './ws/ws-open.js';
export { wsRetryNowRequestSchema, type WsRetryNowRequest } from './ws/ws-retry-now.js';
export { wsSendRequestSchema, type WsSendRequest } from './ws/ws-send.js';
export { WS_FAILURE_CODE, type WsFailureReason } from './ws/ws-failure-reason.js';
export { wsStatePushSchema, type WsState, type WsStatePush } from './ws/ws-state.js';
export {
    fitScriptNote,
    SCRIPT_NOTE_BYTES,
    wsScriptNoteSchema,
    type WsScriptNote,
} from './ws/ws-script-note.js';

export { recordPickRequestSchema, recordPickResultSchema } from './record/record-pick.js';
export { recordStartRequestSchema } from './record/record-start.js';
export { recordStopRequestSchema, recordStopResultSchema } from './record/record-stop.js';
export {
    recordStatusRequestSchema,
    recordStatusResultSchema,
    type RecordStatus,
} from './record/record-status.js';
export { recordRevealRequestSchema } from './record/record-reveal.js';
export { recordStatePushSchema, type RecordStatePush } from './record/record-state.js';
export type { RecordArea } from './record/record-area.js';

export {
    BODY_WINDOW_BYTES,
    FORMAT_BYTES,
    requestBodyReadRequestSchema,
    requestBodyReadResultSchema,
    type BodyWindow,
    type RequestBodyReadRequest,
} from './request/request-body-read.js';
export {
    requestBodySaveRequestSchema,
    requestBodySaveResultSchema,
    type RequestBodySaveRequest,
} from './request/request-body-save.js';
export { requestCancelRequestSchema } from './request/request-cancel.js';
export {
    requestSendRequestSchema,
    requestSendResultSchema,
    type RequestSendRequest,
} from './request/request-send.js';
export {
    requestScriptOutputSchema,
    type RequestScriptOutput,
} from './request/request-script-output.js';
export {
    requestSendLogSchema,
    SEND_LOG_BODY_MAX,
    type RequestSendLog,
} from './request/request-send-log.js';
export type { RequestArea } from './request/request-area.js';

export type { GraphqlArea } from './graphql/graphql-area.js';
export {
    graphqlIntrospectResultSchema,
    type GraphqlIntrospectRequest,
} from './graphql/graphql-introspect.js';
export {
    graphqlSchemaReadRequestSchema,
    graphqlSchemaReadResultSchema,
} from './graphql/graphql-schema-read.js';
export type { CodegenArea } from './codegen/codegen-area.js';
export {
    CURL_TEXT_MAX,
    codegenFromCurlRequestSchema,
    codegenFromCurlResultSchema,
} from './codegen/codegen-from-curl.js';
export {
    codegenSnippetRequestSchema,
    codegenSnippetResultSchema,
    type CodegenSnippet,
    type CodegenSnippetRequest,
} from './codegen/codegen-snippet.js';
export type { CookiesArea } from './cookies/cookies-area.js';
export { cookiesClearRequestSchema } from './cookies/cookies-clear.js';
export { cookiesDeleteRequestSchema } from './cookies/cookies-delete.js';
export {
    cookiesListRequestSchema,
    cookiesListResultSchema,
    type CookieRow,
} from './cookies/cookies-list.js';
export { cookiesSetRequestSchema } from './cookies/cookies-set.js';
export { historyAppendedPushSchema, type HistoryAppendedPush } from './history/history-appended.js';
export type { HistoryArea } from './history/history-area.js';
export { historyDeleteRequestSchema, type HistoryDeleteRequest } from './history/history-delete.js';
export { historyListRequestSchema, historyListResultSchema } from './history/history-list.js';
export { historyReadRequestSchema, historyReadResultSchema } from './history/history-read.js';
