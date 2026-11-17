import type { BridgeKit } from '@mandor/host/bridge-kit';
import type { ConnectionArea, CoreBridge, JsonlExportArea, RecordArea, WsArea } from '@mandor/ipc';

import { createConnectionBridge } from './connection-bridge.js';
import { createJsonlBridge } from './jsonl-bridge.js';
import { createRecordBridge } from './record-bridge.js';
import { createWsBridge } from './ws-bridge.js';

/** What the window of Async reaches: the core of every app, and the areas only Async serves. */
export type AsyncBridge = CoreBridge & {
    export: JsonlExportArea;
    connection: ConnectionArea;
    ws: WsArea;
    record: RecordArea;
};

/**
 * The core as the host built it, and the areas of Async beside it. The export of the lines of
 * what a window was looking at joins the export area of the core instead of standing apart,
 * because to the window it is one more way out of the same workspace.
 */
export function asyncBridgeOf(core: CoreBridge, kit: BridgeKit): AsyncBridge {
    return {
        ...core,
        export: { ...core.export, ...createJsonlBridge(kit) },
        connection: createConnectionBridge(kit),
        ws: createWsBridge(kit),
        record: createRecordBridge(kit),
    };
}
