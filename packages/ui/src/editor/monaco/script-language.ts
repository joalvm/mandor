// The typings of the grammar are ambient, and an import cannot carry an ambient declaration into
// the projects that read this file: only a reference does.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./typescript-internals.d.ts" />
import { editor, languages, type IDisposable } from 'monaco-editor/editor/editor.api.js';

import type { ScriptService } from './script-service.js';

/** Brings the service up: the first script of the window is the one that asks. */
export type ScriptServiceLoader = () => Promise<ScriptService>;

/** The language of scripts as the window holds it: the declarations of each, and its end. */
export type ScriptLanguage = IDisposable & {
    /** What a script is read against, until the returned handle lets go of it. */
    declare: (model: editor.ITextModel, text: string) => IDisposable;
};

type Lifetime = {
    declared: Map<string, { model: editor.ITextModel; text: string }>;
    idle: ReturnType<typeof setTimeout> | undefined;
    open: Set<string>;
    /** The service once it came up, for what the window hands it from then on. */
    ready: ScriptService | null;
    service: Promise<ScriptService> | null;
};

const SCRIPT = 'script';

/** How long the service outlives the last script, for the one opened right after it. */
const IDLE_MS = 20_000;

// The id the editors of scripts ask for: the grammar of JavaScript under a name of its own, so
// the service of scripts answers for them and for nothing else written in JavaScript.
languages.register({ aliases: ['JavaScript'], id: SCRIPT });
languages.onLanguage(SCRIPT, () => {
    void import('monaco-editor/languages/definitions/javascript/javascript.js').then(
        ({ conf, language }) => {
            languages.setLanguageConfiguration(SCRIPT, conf);
            languages.setMonarchTokensProvider(SCRIPT, language);
        },
    );
});

/** Brings the service up once; what was declared while it loaded reaches it as it arrives. */
function start(lifetime: Lifetime, load: ScriptServiceLoader): void {
    if (lifetime.service !== null) {
        return;
    }

    const loading = load().then((service) => {
        // A service stopped while it loaded is disposed by `stop`: it hears nothing.
        if (lifetime.service === loading) {
            lifetime.ready = service;
            lifetime.declared.forEach(({ model, text }) => {
                service.declare(model.uri, text);
            });
        }

        return service;
    });

    lifetime.service = loading;
}

function stop(lifetime: Lifetime): void {
    const { service } = lifetime;

    lifetime.ready = null;
    lifetime.service = null;
    void service?.then((running) => {
        running.dispose();
    });
}

/**
 * The service of scripts, alive while a script is open. The first script brings it up, and the
 * last one to go lets it stop after `idleMs`: it weighs megabytes, and a window with no script
 * open carries none of them. With no `load`, the window has no threads to run it in, and
 * scripts get their grammar alone.
 */
export function mountScriptLanguage(
    load: ScriptServiceLoader | null,
    idleMs: number,
): ScriptLanguage {
    const lifetime: Lifetime = {
        declared: new Map(),
        idle: undefined,
        open: new Set(),
        ready: null,
        service: null,
    };
    const close = (model: editor.ITextModel): void => {
        const key = model.uri.toString();

        if (!lifetime.open.delete(key)) {
            return;
        }

        lifetime.declared.delete(key);
        lifetime.ready?.forget(model.uri);

        if (lifetime.open.size === 0) {
            // timing-policy: the service outlives its last script for the one opened right after,
            // and starting it again costs the window a second of parsing.
            lifetime.idle = setTimeout(stop, idleMs, lifetime);
        }
    };

    const open = (model: editor.ITextModel): void => {
        if (load === null || model.getLanguageId() !== SCRIPT) {
            return;
        }

        clearTimeout(lifetime.idle);
        lifetime.open.add(model.uri.toString());
        start(lifetime, load);
    };

    const heard = [
        editor.onDidCreateModel((model) => {
            open(model);
            model.onWillDispose(() => {
                close(model);
            });
        }),
        editor.onDidChangeModelLanguage(({ model }) => {
            close(model);
            open(model);
        }),
    ];

    return {
        declare: (model, text) => {
            const key = model.uri.toString();

            lifetime.declared.set(key, { model, text });
            lifetime.ready?.declare(model.uri, text);

            return {
                dispose: () => {
                    if (lifetime.declared.get(key)?.text === text) {
                        lifetime.declared.delete(key);
                    }
                },
            };
        },
        dispose: () => {
            clearTimeout(lifetime.idle);
            heard.forEach((listener) => {
                listener.dispose();
            });
            stop(lifetime);
        },
    };
}

async function loadScriptService(): Promise<ScriptService> {
    const { spawnScriptThread, startScriptService } = await import('./script-service.js');

    return startScriptService(spawnScriptThread);
}

// The window of the app runs the service in a thread of its own. A window with no threads, the
// one the tests of the app draw in, writes scripts with their grammar and nothing else.
const scriptLanguage = mountScriptLanguage(
    typeof Worker === 'function' ? loadScriptService : null,
    IDLE_MS,
);

/** What the script of `model` is read against, while the returned handle holds it. */
export function declareScript(model: editor.ITextModel, text: string): IDisposable {
    return scriptLanguage.declare(model, text);
}
