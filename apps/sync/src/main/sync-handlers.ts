import {
    pushToWindow,
    readSecret,
    systemNetworkFor,
    systemSaveDialog,
    type AppHandlerContext,
    type AppHandlers,
} from '@mandor/host';
import { CHANNELS } from '@mandor/ipc';

import { registerCodegenHandlers } from './codegen/codegen.handlers.js';
import { createCookieJarStore } from './cookies/cookie-jar-store.js';
import { registerCookiesHandlers } from './cookies/cookies.handlers.js';
import { registerGraphqlHandlers } from './graphql/graphql.handlers.js';
import { registerHistoryHandlers } from './history/history.handlers.js';
import { createSendRecorder } from './history/send-recorder.js';
import { registerRequestHandlers } from './request/request.handlers.js';
import type { SendDeps } from './request/run-send.js';
import { tellingSendLog } from './request/send-log.js';

/** The jars of the app: one in memory per file, so every send and the window see the same cookies. */
const cookieJars = createCookieJarStore();

/** What every request that leaves Sync asks of the app, whoever made it: a send or a question. */
function dialing(context: AppHandlerContext): SendDeps {
    return {
        readSecret: (key) => readSecret(context.userDataDir, key),
        networkFor: systemNetworkFor(context.userDataDir),
    };
}

/** The requests of Sync: sent, cut, and their bodies read and saved. Each send is remembered. */
const requestHandlers: AppHandlers = (ipc, context) => [
    registerRequestHandlers(ipc, {
        ...dialing(context),
        cookieJars,
        // A body is saved with whatever extension its name carries: no filter narrows the dialog.
        chooseSavePath: systemSaveDialog(() => []),
        // The console hears every send, the history keeps those that left.
        afterSend: tellingSendLog((log) => {
            pushToWindow(context.window, CHANNELS.requestSendLog, log);
        }, createSendRecorder(context)),
        scripts: context.scripts,
        scriptVariables: context.scriptVariables,
        logger: context.logger,
        tell: (output) => {
            pushToWindow(context.window, CHANNELS.requestScriptOutput, output);
        },
        warn: (message) => {
            context.logger.log('warn', message);
        },
    }),
];

/** What was sent and what came back, listed, read and deleted. */
const historyHandlers: AppHandlers = (ipc) => [registerHistoryHandlers(ipc)];

/** The schema of the server a GraphQL request points at, kept and asked for. */
const graphqlHandlers: AppHandlers = (ipc, context) => [
    registerGraphqlHandlers(ipc, dialing(context)),
];

/** The cookies the servers set, listed and edited, per environment. */
const cookiesHandlers: AppHandlers = (ipc) => [registerCookiesHandlers(ipc, cookieJars)];

/** A curl command read into a request, and a request written as code. */
const codegenHandlers: AppHandlers = (ipc, context) => [
    registerCodegenHandlers(ipc, { readSecret: (key) => readSecret(context.userDataDir, key) }),
];

/** The channels only Sync answers, registered by the host after the common ones. */
export const SYNC_HANDLERS: readonly AppHandlers[] = [
    requestHandlers,
    historyHandlers,
    graphqlHandlers,
    cookiesHandlers,
    codegenHandlers,
];
