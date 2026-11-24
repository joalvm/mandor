import { editor, languages, type IDisposable, type Uri } from 'monaco-editor/editor/editor.api.js';

import { checkScripts } from './script-diagnostics.js';
import {
    completionsOf,
    hoverOf,
    signaturesOf,
    type ScriptWorker,
    type WorkerOf,
} from './script-providers.js';

/** The service once it runs: what each script is read against, and the way to stop it. */
export type ScriptService = {
    declare: (uri: Uri, text: string) => void;
    dispose: () => void;
    forget: (uri: Uri) => void;
};

/** A worker of the service, for the window to ask and to end. */
export type ScriptThread = { stop: () => void; workerOf: WorkerOf };

/**
 * How the service reads a script: JavaScript checked against its types, every script a module
 * of its own, and the library of the language and nothing of a browser, since the engine that
 * runs it has neither a page nor a network of its own. ECMAScript names the numbers below:
 * `module` and `target` are the latest, `moduleDetection` is `force`.
 */
export const COMPILER_OPTIONS = {
    allowJs: true,
    allowNonTsExtensions: true,
    checkJs: true,
    lib: ['lib.es2023.d.ts'],
    module: 99,
    moduleDetection: 3,
    noEmit: true,
    target: 99,
};

/** How long a script waits after its writer's last key before the service reads it. */
const PAUSE_MS = 500;

/** The worker the bundle builds out of the thread of the service, started with its options. */
function startedThread(): Worker {
    const thread = new Worker(new URL('./script-worker-main.ts', import.meta.url), {
        name: 'script',
        type: 'module',
    });

    thread.postMessage('ignore');
    thread.postMessage({ compilerOptions: COMPILER_OPTIONS, extraLibs: {} });

    return thread;
}

/** The service in a thread of its own: it reads the program whole, and the window never waits. */
export function spawnScriptThread(): ScriptThread {
    const client = editor.createWebWorker<ScriptWorker>({
        keepIdleModels: true,
        worker: startedThread(),
    });

    return {
        stop: () => {
            client.dispose();
        },
        workerOf: (...uris) => client.withSyncedResources(uris),
    };
}

/**
 * Starts the service of scripts: completion, the signature of a call, what a name is and the
 * marks of its types, all for the language of scripts and no other. The thread is `spawn`'s.
 */
export function startScriptService(spawn: () => ScriptThread): ScriptService {
    const { stop, workerOf } = spawn();
    const checks = checkScripts(workerOf, PAUSE_MS);
    const providers: IDisposable[] = [
        languages.registerCompletionItemProvider('script', completionsOf(workerOf)),
        languages.registerSignatureHelpProvider('script', signaturesOf(workerOf)),
        languages.registerHoverProvider('script', hoverOf(workerOf)),
        checks,
    ];
    const recheck = (uri: Uri): void => {
        const model = editor.getModel(uri);

        if (model !== null) {
            checks.recheck(model);
        }
    };

    return {
        declare: (uri, text) => {
            void workerOf(uri)
                .then((worker) => worker.setDeclarations(uri.toString(), text))
                .then(() => {
                    recheck(uri);
                });
        },
        dispose: () => {
            providers.forEach((provider) => {
                provider.dispose();
            });
            stop();
        },
        forget: (uri) => {
            void workerOf().then((worker) => worker.forgetDeclarations(uri.toString()));
        },
    };
}
