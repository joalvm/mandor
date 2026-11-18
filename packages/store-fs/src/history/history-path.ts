import { join } from 'node:path';

import { assertSegment } from '@mandor/schema';

import { mandorDir } from '../repo/repo-path.js';

const HISTORY_DIR = 'history';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SENT_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const ENTRY_FILE = /^\d{8}T\d{9}Z-[0-9a-f-]{36}\.json$/;

/** Where the history of every workspace of an origin is kept, one folder each. */
export function historiesDir(root: string): string {
    return join(mandorDir(root), HISTORY_DIR);
}

/** Where the sends of one workspace are kept, inside `.mandor`: it never goes to git. */
export function historyDir(root: string, workspaceId: string): string {
    assertSegment(workspaceId);

    return join(historiesDir(root), workspaceId);
}

/** Only a lowercase uuid names an entry: anything else could carry a separator out of the folder. */
export function assertHistoryId(id: string): void {
    if (!UUID.test(id)) {
        throw new Error('An entry of the history is named by a uuid in lowercase');
    }
}

/**
 * `2026-09-23T10:15:30.123Z` becomes `20260923T101530123Z`, so the alphabetical order of the
 * folder is the chronological one and listing needs no index that could drift from the files.
 */
export function historyFileName(sentAt: string, id: string): string {
    assertHistoryId(id);

    if (!SENT_AT.test(sentAt)) {
        throw new Error('The time of a send is ISO 8601 in UTC with milliseconds');
    }

    return `${compactSentAt(sentAt)}-${id}.json`;
}

/** The time of a send as a file name starts with it: `20260923T101530123Z`. */
export function compactSentAt(sentAt: string): string {
    return sentAt.replaceAll(/[-:.]/g, '');
}

/** True for the name of an entry as `historyFileName` writes it. */
export function isHistoryFileName(name: string): boolean {
    return ENTRY_FILE.test(name);
}

/** Path of one entry. The name is checked here, so what a caller joins cannot walk out. */
export function historyEntryFile(root: string, workspaceId: string, fileName: string): string {
    if (!isHistoryFileName(fileName)) {
        throw new Error('Not the name of an entry of the history');
    }

    return join(historyDir(root, workspaceId), fileName);
}
