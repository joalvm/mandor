// The typings of the bootstrap are ambient, and an import cannot carry an ambient declaration
// into the projects that read this file: only a reference does.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./typescript-internals.d.ts" />
import { initialize } from 'monaco-editor/internal/common/initialize.js';

import { ScriptTsWorker } from './script-ts-worker.js';

/**
 * The thread of the service of scripts. The window speaks first to say it is there, and then
 * hands over what the service starts with; from then on the editor's own protocol carries it.
 */
self.onmessage = () => {
    initialize((ctx, createData) => new ScriptTsWorker(ctx, createData));
};
