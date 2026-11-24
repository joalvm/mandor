// Matchers for the jsdom project. Loaded once per renderer test file so a test
// can assert what the user sees instead of poking at DOM properties.
/// <reference lib="dom" />

import '@testing-library/jest-dom/vitest';

import { createFakeBridge } from '@mandor/ipc/testing';
import {
    forgetTextZoom,
    preloadEditorRuntime,
    settleEditorRuntime,
    strayEditors,
} from '@mandor/ui/testing/editors-in';
import { preloadMarkdownRuntime } from '@mandor/ui/testing/markdown-runtime';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import { resetStores } from './stores.js';

// React en desarrollo saluda a React DevTools a través de `__REACT_DEVTOOLS_GLOBAL_HOOK__`,
// y un jsdom no puede tener una extensión de navegador que lo instale: en cada fichero de
// test, React anunciaba que no la encontró. La ventana de prueba responde al saludo con un
// gancho vacío, que es lo que una ventana sin la extensión instalada tiene: React registra
// su renderizador y calla, y nada de lo que un test afirme cambia. El `checkDCE` es lo que
// cierra el saludo: sin él, React sigue anunciando devtools en cada fichero que carga el
// renderizador por primera vez.
const hookStub = {
    checkDCE: () => undefined,
    inject: () => 0,
    onCommitFiberRoot: () => undefined,
    onPostCommitFiberRoot: () => undefined,
    onScheduleFiberRoot: () => undefined,
    supportsFiber: true,
};

Object.assign(globalThis, { __REACT_DEVTOOLS_GLOBAL_HOOK__: hookStub });

// React warns about an update that lands outside act only where the window says it runs tests.
// Testing Library says so around each file it was imported by, and it is imported once per
// worker: the file after the first would run with the warnings off. Every file says it here.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

// The files of a worker share their modules, so whatever a module does when it loads happens once,
// for the first file. Testing Library's own cleanup is one of those: it registers itself when it
// is imported, and every file after the first would keep the windows of the one before. It is
// switched off in the config and registered here, where it runs for every file. Hooks run in
// reverse order, so it runs after the editor below has settled and before nothing else.
// Once the window is gone, nothing of the editor is left: an editor still mounted keeps rendering
// into the tests after this one, and a document still open hands the next editor of its key the
// text this test typed. Registered before the cleanup, so it runs after it.
afterEach(async () => {
    const stray = await strayEditors();

    if (stray.editors > 0 || stray.models > 0) {
        throw new Error(
            `The test left ${String(stray.editors)} editors and ${String(stray.models)} documents behind: it disposes what it mounts by hand.`,
        );
    }
});

afterEach(cleanup);

// The editor loads apart, the first time one is drawn, and lands after the render that asked for
// it. A test that draws one and never looks at it waits for it here, inside act, so it lands in
// its own test and not in the next one, or after the window is gone.
afterEach(settleEditorRuntime);

// jsdom has no preload, so the window carries no bridge and every module that reads it at
// import time would find nothing. The double answers with success and touches no disk; a test
// that cares what crossed the bridge spies on it. Modules keep the bridge they found when they
// loaded, and they load once per worker: so the window keeps one bridge for good, and each file
// gets fresh areas on it, with no spy and no listener left by the file before.
const installed = (globalThis as { mandor?: object }).mandor;

if (installed === undefined) {
    Object.assign(globalThis, { mandor: createFakeBridge() });
} else {
    Object.assign(installed, createFakeBridge());
}

// The files of a worker share the window too. Each starts where a fresh window would: nothing in
// the body, no attribute on the page, nothing stored. The head keeps only the styles that modules
// add once, when they load, and would not add again; a tag a test declared there goes.
document.body.replaceChildren();

for (const element of [document.documentElement, document.body]) {
    for (const name of element.getAttributeNames()) {
        element.removeAttribute(name);
    }
}

document.head.querySelectorAll(':scope > :not(style, link)').forEach((node) => {
    node.remove();
});

// And every store is the one a fresh module graph would have made: in the state it was born with,
// whatever the file before put in it, and the text of the window is at the size of the app. A
// store that writes through to storage on a change does so here, and the storage is cleared after.
resetStores();
forgetTextZoom();
localStorage.clear();
sessionStorage.clear();

// jsdom has no ResizeObserver, and the grid asks for one the moment it mounts.
// Layout in a test is arithmetic on shares, not pixels measured off a window
// that has no size, so the stub is allowed to observe nothing.
class StubResizeObserver {
    observe(): void {
        // A test never resizes.
    }

    unobserve(): void {
        // Nothing was observed.
    }

    disconnect(): void {
        // Nothing to let go of.
    }
}

Object.assign(globalThis, { ResizeObserver: StubResizeObserver });

// Loading the worker of the standard `json` language pulls the clipboard of the editor with it,
// and the clipboard asks the document which commands it supports while it loads. jsdom has no
// such question; Chromium, which the renderer really is, answers yes to every one of these.
Object.assign(document, { queryCommandSupported: () => true });

// jsdom loads no fonts: every face a test asks for is already in, as it is once the window loaded it.
Object.assign(document, {
    fonts: { addEventListener: () => undefined, load: () => Promise.resolve([]) },
});

// Radix restores focus and scrolls its active option. JSDOM has neither browser API, while the
// interaction itself stays covered by the primitive tests that open the real Select.
const elementPrototype = Object.getPrototypeOf(document.createElement('div')) as {
    hasPointerCapture: (pointerId: number) => boolean;
    scrollIntoView: () => void;
};

Object.assign(elementPrototype, {
    hasPointerCapture: () => false,
    scrollIntoView: () => undefined,
});

// jsdom answers no media query. The editor and the theme it follows ask which scheme the system
// prefers; a window with no system behind it prefers none, and never changes its mind. A test
// that needs the system to prefer dark stubs its own.
if (typeof window.matchMedia !== 'function') {
    window.matchMedia = (query: string) =>
        Object.assign(new EventTarget(), {
            addListener: () => undefined,
            matches: false,
            media: query,
            onchange: null,
            removeListener: () => undefined,
        });
}

// The renderer is Chromium. Left to its default, jsdom introduces itself as a WebKit that is not
// Chrome, and the editor answers with the workarounds it keeps for Safari: one of them writes to a
// clipboard jsdom does not have on every key and every click. The editor reads the name once, when
// it loads, so it is set here, before any test imports it. A test that needs another system sets
// its own over this one.
Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
});

// The editor measures glyphs and paints its overview rulers on a canvas. jsdom has none and says
// so on the console every time. A context that draws nothing stands in for a flat one, and
// measures every glyph as wide as jsdom lays every line out: zero.
function blankCanvas(): object {
    const nothing = (): void => undefined;

    return {
        beginPath: nothing,
        clearRect: nothing,
        fillRect: nothing,
        lineTo: nothing,
        measureText: () => ({ width: 0 }),
        moveTo: nothing,
        stroke: nothing,
    };
}

Object.assign(HTMLCanvasElement.prototype, {
    getContext: (kind: string) => (kind === '2d' ? blankCanvas() : null),
});

// jsdom lays nothing out: every line the editor draws is zero pixels wide. On Linux, two seconds
// after it draws, the editor checks that its lines are as wide as its font says, and under jsdom
// the answer is always no. It says so once per module graph, so which test hears it depends on
// which file ran first in the worker, and a test with a stopped clock that moves it two seconds
// is the one that does. The check measures jsdom and not the code under test, so its one sentence
// is dropped before the console guard reads it. Wrapped once: the files of a worker share it.
const MEASURED_NOTHING = 'monospace assumptions have been violated';
const QUIETED = Symbol.for('mandor.console.quieted');

if (Reflect.get(console, QUIETED) !== true) {
    const warn = console.warn.bind(console);

    Reflect.set(console, QUIETED, true);
    console.warn = (...parts: unknown[]) => {
        if (typeof parts[0] !== 'string' || !parts[0].startsWith(MEASURED_NOTHING)) {
            warn(...parts);
        }
    };
}

// Last, because the editor reads the window as it is evaluated: its name, its media queries, its
// canvas. In a worker whose files share their modules, whether the editor is still loading when a
// test draws one depends on which file ran before, and a load that lands between two hooks is an
// update outside act. So the worker loads it before its first file, and every editor a test draws
// mounts at once. The files that test the load itself run alone, where it is still lazy. The
// renderer of markdown loads apart the same way, for the same reason.
if (process.env['MANDOR_SHARED_MODULES'] === 'true') {
    await preloadEditorRuntime();
    await preloadMarkdownRuntime();
}
