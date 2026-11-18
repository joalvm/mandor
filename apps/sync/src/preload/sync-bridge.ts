import type { BridgeKit } from '@mandor/host/bridge-kit';
import type {
    CodegenArea,
    CookiesArea,
    CoreBridge,
    GraphqlArea,
    HistoryArea,
    RequestArea,
} from '@mandor/ipc';

import { createCodegenBridge } from './codegen-bridge.js';
import { createCookiesBridge } from './cookies-bridge.js';
import { createGraphqlBridge } from './graphql-bridge.js';
import { createHistoryBridge } from './history-bridge.js';
import { createRequestBridge } from './request-bridge.js';

/** What the window of Sync reaches: the core of every app, and the areas only Sync serves. */
export type SyncBridge = CoreBridge & {
    request: RequestArea;
    history: HistoryArea;
    graphql: GraphqlArea;
    cookies: CookiesArea;
    codegen: CodegenArea;
};

/** The core as the host built it, and the areas of Sync beside it. */
export function syncBridgeOf(core: CoreBridge, kit: BridgeKit): SyncBridge {
    return {
        ...core,
        request: createRequestBridge(kit),
        history: createHistoryBridge(kit),
        graphql: createGraphqlBridge(kit),
        cookies: createCookiesBridge(kit),
        codegen: createCodegenBridge(kit),
    };
}
