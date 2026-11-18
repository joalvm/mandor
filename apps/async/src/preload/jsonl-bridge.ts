import type { BridgeKit } from '@mandor/host/bridge-kit';
import { CHANNELS, exportJsonlResultSchema, type JsonlExportArea } from '@mandor/ipc';

/**
 * The export of what a window was looking at, line by line. The answer is validated at this
 * edge; the lines leave redacted, and redacting them is main's.
 */
export function createJsonlBridge({ call }: BridgeKit): JsonlExportArea {
    return {
        jsonl: (input) => call(CHANNELS.exportJsonl, exportJsonlResultSchema, input),
    };
}
