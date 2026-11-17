import { mkdir } from 'node:fs/promises';

import { redactMessage } from '@mandor/host';
import type { HistoryEntry } from '@mandor/schema';
import { atomicWrite, historyDir, historyEntryFile, historyFileName } from '@mandor/store-fs';

/**
 * Writes the entry of one send, one file per send. It is a border of the process: what is in
 * the entry is text of the session, so it leaves redacted, like every line of a recording.
 */
export async function recordHistory(root: string, entry: HistoryEntry): Promise<void> {
    const name = historyFileName(entry.sentAt, entry.id);
    const file = historyEntryFile(root, entry.workspaceId, name);

    await mkdir(historyDir(root, entry.workspaceId), { recursive: true });
    await atomicWrite(file, JSON.stringify(redactMessage(entry), null, 2));
}
