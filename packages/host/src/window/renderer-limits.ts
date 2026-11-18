/**
 * What the renderer is allowed to spend. Each entry is a Chromium subsystem Mandor never uses:
 * off means its memory is never allocated and its code is never compiled.
 */
export const RENDERER_LIMITS = {
    // Every socket lives in main, so a window nobody is looking at has nothing to stay awake for.
    // Timers and animations stop while it is hidden and the renderer falls to idle. Turning this
    // off to keep something alive in the renderer is the wrong fix: move that work to main.
    backgroundThrottling: true,
    // The spellchecker loads a dictionary per language and keeps it resident for the life of the
    // process. Mandor edits requests and YAML, not prose.
    spellcheck: false,
    // Nothing here draws with WebGL, and a GPU context per renderer is not free.
    webgl: false,
    // WebSQL is a deprecated sqlite backend. Mandor's storage is the repository on disk.
    enableWebSQL: false,
} as const;
