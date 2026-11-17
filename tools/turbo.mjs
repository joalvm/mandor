#!/usr/bin/env node
// Single entry point for turborepo.
//
// Turbo reports anonymous telemetry by default and there is no repository-level
// setting to turn it off: only the TURBO_TELEMETRY_DISABLED environment
// variable, or a global flag written outside the repository. Setting the
// variable inside an npm script is not portable (cmd.exe on Windows does not
// understand the VAR=value prefix), so the variable is set here, where every
// contributor and CI machine gets the same behaviour without extra setup.

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const turboBin = require.resolve('turbo/bin/turbo');

const result = spawnSync(process.execPath, [turboBin, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: {
        ...process.env,
        TURBO_TELEMETRY_DISABLED: '1',
        TURBO_TELEMETRY_MESSAGE_DISABLED: '1',
        TURBO_NO_UPDATE_NOTIFIER: '1',
    },
});

process.exit(result.status ?? 1);
