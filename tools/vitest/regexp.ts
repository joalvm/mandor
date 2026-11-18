// The regex engines a test reads patterns with are the app's: V8's linear engine on, and the
// backtracking one handing it a regex that backtracks too much. Without them a test of a schema
// would judge with an engine no window has. The host hands the windows the same flags; main
// starts without them. The flags are the process's, so every file of a worker reads them.
// eslint-disable-next-line no-restricted-imports -- plain Node starts a worker after it, Electron's main does not
import { setFlagsFromString } from 'node:v8';

import { REGEX_FLAGS } from '../../packages/host/src/runtime/chromium-limits.js';
import { loadSchemaChecker } from '../../packages/validate/src/schema-checker/schema-checker.js';
import { loadSchemaToValue } from '../../packages/validate/src/schema-to-value/load-schema-to-value.js';

setFlagsFromString(REGEX_FLAGS);

// The checker the schemas are read with loads apart, the first time a schema is read, and a read
// before it arrives is waiting, not answered. A test of a verdict reads the verdict, not the
// wait, so every file starts with the checker there. The tests of the wait load a fresh copy.
await loadSchemaChecker();

// The generator loads the same way, on the first click on generate; a test of what the click
// writes reads the body, not the wait.
await loadSchemaToValue();
