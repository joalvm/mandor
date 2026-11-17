import type { ErrorCode, JsonlExportArea } from '@mandor/ipc';

import type { ActivityEntry } from '../../../activity/activity-entry.js';
import { activityExportRecords } from './activity-export-records.js';

/** What the save dialog offers. The user decides where it really goes. */
const SUGGESTED_NAME = 'activity.jsonl';

type ExportJsonl = JsonlExportArea['jsonl'];

/**
 * Writes the timeline out through the export channel. A failed write comes back as an error
 * code for the toast; a closed dialog comes back as nothing, because nothing went wrong —
 * the user just said no.
 */
export async function exportActivity(
    entries: readonly ActivityEntry[],
    exportJsonl: ExportJsonl,
): Promise<ErrorCode | null> {
    const result = await exportJsonl({
        records: activityExportRecords(entries),
        suggestedName: SUGGESTED_NAME,
    });

    if (result.ok) {
        return null;
    }

    return result.error.code;
}
