import { serveImportReads } from '@mandor/host/import-worker';

import { ASYNC_FORMATS } from './formats.js';

// The bundle every import reads its files in, beside main. A shared document chooses what the
// parser runs; here it runs against a clock and a ceiling of memory, and main stays free.
serveImportReads(ASYNC_FORMATS);
