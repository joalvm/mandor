// The only barrel in the package. It states the public API and nothing else: inside the
// package every module imports the file that defines the symbol.

/// The kit of a handler: what any handler of main needs, wherever the app that registers it is.
export { AuthTokenError } from './auth/auth-token-error.js';
export { resolveAuth, type TokenSource } from './auth/resolve-auth.js';
export {
    environmentScope,
    globalValuesOf,
    type EnvironmentPlace,
    type EnvironmentScope,
    variableScopeOf,
} from './environment/environment-scope.js';
export type { ChooseSavePath } from './export/choose-save-path.js';
export { systemSaveDialog } from './export/system-save-dialog.js';
export { failureOf } from './ipc/failure-of.js';
export { rootedHandler } from './ipc/rooted-handler.js';
export { activeRepo } from './origin/active-repo.js';
export { flushAllCommits } from './repo/commit-scheduler.js';
export { nameOnDisk } from './repo/name-on-disk.js';
export { repoRelative } from './repo/repo-relative.js';
export { guardedWrite } from './repo/guarded-write.js';
export { rememberText } from './repo/known-texts.js';
export { reshapeRepo } from './repo/reshape-repo.js';
export type { ReadSecretValue } from './secret/read-secret-value.js';
export { answerRedactor, redactMessage } from './secret/redact-message.js';
export { rememberSessionSecrets } from './secret/session-secrets.js';

export type { HandlerIpc } from './ipc/handler-ipc.js';
export { pushToWindow, type PushTarget } from './ipc/push-to-window.js';

export { readSecret } from './origin/secret-store.js';
export { type DialNetwork, type DialTls, type NetworkFor } from './network/network-for.js';
export { NetworkFileError } from './network/network-file-error.js';
export { systemNetworkFor } from './network/system-network-for.js';
export { UnsupportedProxyError } from './network/unsupported-proxy-error.js';

export { reportUnreadable, type UnreadableDeps } from './notice/unreadable-files.js';
export type { AppHandlerContext, AppHandlers } from './runtime/register-handlers.js';
export { failToStart } from './runtime/fail-to-start.js';
export {
    newScriptSlots,
    startScriptWorker,
    type ScriptChain,
    type ScriptChainOptions,
    type ScriptSlotsOptions,
} from './script/start-script-worker.js';
export type { ScriptOutcome } from './script/run-on-worker.js';
export { runChain, type ChainDeps, type ChainRun, type ChainSnapshot } from './script/run-chain.js';
export type { ChainEntry, ChainPlace } from './script/chain-entries.js';
export type { ChainResult } from './script/chain-output.js';
export {
    createScriptVariables,
    type ScriptVariables,
    type ScriptVariablesPlace,
} from './script/script-variables.js';
export { variableSnapshot } from './script/variable-snapshot.js';
export { newScriptSender, type ScriptSender, type ScriptSenderDeps } from './script/script-send.js';
export { startHost, type StartHostConfig } from './runtime/start-host.js';
