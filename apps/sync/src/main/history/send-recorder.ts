import { pushToWindow, type AppHandlerContext } from '@mandor/host';
import { CHANNELS } from '@mandor/ipc';
import { historySummaryOf } from '@mandor/schema';

import type { SendEvent, SendObserver } from '../request/send-event.js';
import { historyEntryOf, type RecordedSend } from './history-entry-of.js';
import type { HistoryRetention } from './history-retention.js';
import { recordHistory } from './history-writer.js';
import { pruneHistory } from './prune-history.js';

/** An abort is the user changing their mind; every other `request-` failure did go out. */
const NOT_REMEMBERED = 'request-aborted';

function isRecorded(event: SendEvent): event is RecordedSend {
    if (event.sent === undefined) {
        return false;
    }

    if (event.outcome.ok) {
        return true;
    }

    const { code } = event.outcome.error;

    return code.startsWith('request-') && code !== NOT_REMEMBERED;
}

function warn(context: AppHandlerContext, error: unknown): void {
    context.logger.log('warn', `history: ${error instanceof Error ? error.message : 'failed'}`);
}

/** Limits that could not be applied leave the folder over them until the next send, nothing more. */
async function prunedOrNone(
    context: AppHandlerContext,
    root: string,
    workspaceId: string,
    retention: HistoryRetention,
): Promise<string[]> {
    try {
        return await pruneHistory(root, workspaceId, new Date(), retention.limits());
    } catch (error) {
        warn(context, error);

        return [];
    }
}

/**
 * Remembers every send that left the machine, and tells the window it did and which sends the
 * limits the person chose took out to make room, so the list there never holds more than the disk. It is total: a
 * disk that refuses the entry is a warning in the log and never an error on the send, whose
 * answer is already decided when this runs.
 */
export function createSendRecorder(
    context: AppHandlerContext,
    retention: HistoryRetention,
): SendObserver {
    return async (event) => {
        if (!isRecorded(event)) {
            return;
        }

        try {
            const entry = await historyEntryOf(event.root, event);

            await recordHistory(event.root, entry);
            pushToWindow(context.window, CHANNELS.historyAppended, {
                workspaceId: entry.workspaceId,
                summary: historySummaryOf(entry),
                removed: await prunedOrNone(context, event.root, entry.workspaceId, retention),
            });
        } catch (error) {
            warn(context, error);
        }
    };
}
