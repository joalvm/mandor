import { serveImportReads } from '@mandor/host/import-worker';

import { SYNC_FORMATS } from './formats.js';

// The bundle every import reads its files in, beside main. A shared document chooses what the
// parser runs; here it runs against a clock and a ceiling of memory, and main stays free.
serveImportReads(SYNC_FORMATS);
