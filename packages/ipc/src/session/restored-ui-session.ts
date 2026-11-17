import { z } from 'zod';

import { migrateUiSession } from './migrate-ui-session.js';
import { EMPTY_UI_SESSION, uiSessionSchema } from './ui-session.js';

/**
 * What comes back from disk. An older format is upgraded; a version this build does not know,
 * or a file someone edited by hand, falls back to a single empty group. Losing an arrangement
 * costs a minute of dragging, and refusing to start costs the whole app.
 */
export const restoredUiSessionSchema = z
    .unknown()
    .transform(migrateUiSession)
    .pipe(uiSessionSchema)
    .catch(EMPTY_UI_SESSION);
