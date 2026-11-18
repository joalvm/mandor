import type { z } from 'zod';

import type { historyEntrySchema } from './history-entry-schema.js';

/**
 * One send in the history of a workspace. `id` is the `sendId` of the window, `sentAt` is ISO
 * 8601 in UTC with milliseconds, `itemPath` is the collection path of the request, or null for one saved nowhere, and `request.url`
 * is the resolved one, query included.
 */
export type HistoryEntry = z.infer<typeof historyEntrySchema>;
