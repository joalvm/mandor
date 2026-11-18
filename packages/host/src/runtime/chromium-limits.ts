/** The slice of Electron's command line these limits touch. Structural, so a test can watch it. */
type CommandLine = {
    appendSwitch: (name: string, value?: string) => void;
};

const MEGABYTE = 1024 * 1024;

// Mandor's memory is bounded by design: activity lives in a ring buffer, the editor keeps one
// shared document per open resource, and the documents on disk are small YAML files. Nothing
// legitimate comes near this ceiling, so it is a tripwire: a leak dies loudly instead of
// creeping to gigabytes while the app still looks healthy.
const MAX_OLD_SPACE_MB = 512;

// V8 sizes the young generation itself and can settle on a very small semi space. A young
// generation that is too small promotes short-lived objects into the old space instead of letting
// them die in a cheap scavenge, and the old space is the one that never gives memory back. A
// socket delivering thousands of messages a minute allocates exactly that kind of garbage.
const MAX_SEMI_SPACE_MB = 16;

// A pattern with a quantifier inside a quantifier backtracks exponentially, and the schemas that
// check every frame and payload come with the documents a user imports. Past a number of
// backtracks V8 reads the regex again with its linear engine, which answers the same in time
// proportional to the text. It takes no pattern read with `u`; `@mandor/validate` drops that flag
// where the pattern does not need it. The engine on its own is what lets `@mandor/validate` ask
// whether it reads a pattern, and leave out the risky ones it does not.
//
// Main does not get it. Electron reads `--js-flags` for main only from the command line it was
// launched with, and setting a flag on main's V8 at run time makes every isolate started after
// it, the import worker among them, kill the process. In main `@mandor/validate` finds no linear
// engine and leaves the risky patterns out instead.
export const REGEX_FLAGS =
    '--enable-experimental-regexp-engine --enable-experimental-regexp-engine-on-excessive-backtracks';

const V8_FLAGS = [
    `--max-old-space-size=${String(MAX_OLD_SPACE_MB)}`,
    `--max-semi-space-size=${String(MAX_SEMI_SPACE_MB)}`,
    REGEX_FLAGS,
];

/** Switch name and value, in the form `app.commandLine.appendSwitch` takes them. */
export const CHROMIUM_LIMITS = [
    ['js-flags', V8_FLAGS.join(' ')],
    // The renderer already loads every asset from disk. A cache on top of that is growth with
    // no reader.
    ['disk-cache-size', String(50 * MEGABYTE)],
] as const;

/**
 * Puts the limits on the command line of the app. Electron only hands `--js-flags` to the main
 * process when the switch is present at startup, so this runs before `app.whenReady()`. Called
 * any later it is accepted and ignored, which is worse than failing.
 */
export function applyChromiumLimits(commandLine: CommandLine): void {
    for (const [name, value] of CHROMIUM_LIMITS) {
        commandLine.appendSwitch(name, value);
    }
}
