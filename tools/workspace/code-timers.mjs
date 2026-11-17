/**
 * What the code leaves waiting when a test file ends.
 *
 * The files of a worker share their modules, and a module that defers work keeps its timer across
 * the end of a file: a write that waits for the typing to stop, the session that waits for the
 * layout to settle. The timer fired inside the next file, on the bridge that file was spying on,
 * and failed a test that had done nothing. So the setup of each file runs, on its way out, what
 * the code left waiting, in the file that scheduled it: the way a window that closes flushes what
 * it owes the disk. What that work schedules in turn runs too.
 *
 * A library and a test keep their own timers, and a turn without a delay is not a wait: only a
 * timer with a delay, started by the source of a package or an app, is the code's.
 */

const CODE = /[\\/](?:packages|apps)[\\/][^\\/]+[\\/]src[\\/]/u;
const LEDGER = /[\\/](?:code-timers\.mjs|vitest[\\/]timers\.ts)/u;
const LIBRARY = /[\\/]node_modules[\\/]/u;
const ROUNDS = 10;

/**
 * Whether the first caller outside the ledger is the source of a package or an app.
 *
 * @param {readonly string[]} files the file of each frame of the stack, innermost first
 */
export function calledFromCode(files) {
    const caller = files.find((file) => !LEDGER.test(file)) ?? '';

    return CODE.test(caller) && !LIBRARY.test(caller);
}

/**
 * @typedef {(...args: never[]) => unknown} Callback
 * @typedef {{ handle: unknown; run: () => void }} Waiting
 * @param {{
 *     set: (callback: Callback, delay?: number, ...args: unknown[]) => unknown;
 *     clear: (handle: never) => void;
 *     fromCode: () => boolean;
 * }} host the clock of the runtime, and who is asking for it
 */
export function timerLedger(host) {
    /** @type {Map<number, Waiting>} */
    const waiting = new Map();

    /** @param {unknown} handle */
    function stop(handle) {
        waiting.delete(Number(handle));
        host.clear(/** @type {never} */ (handle));
    }

    /**
     * @param {(...args: unknown[]) => unknown} callback
     * @param {number} [delay]
     * @param {unknown[]} args
     */
    function start(callback, delay, ...args) {
        const timer = { key: 0 };
        const handle = host.set(() => {
            waiting.delete(timer.key);
            callback(...args);
        }, delay);

        timer.key = Number(handle);

        if ((delay ?? 0) > 0 && host.fromCode()) {
            waiting.set(timer.key, { handle, run: () => callback(...args) });
        }

        return handle;
    }

    function runLeftovers() {
        for (let round = 0; round < ROUNDS; round += 1) {
            const left = [...waiting.values()];

            if (left.length === 0) {
                return;
            }

            for (const timer of left) {
                stop(timer.handle);
                timer.run();
            }
        }

        throw new Error(
            `The code keeps scheduling timers: after ${String(ROUNDS)} rounds of running what ` +
                'the file left waiting, there is more. Whatever reschedules itself stops when ' +
                'the test ends.',
        );
    }

    return { start, stop, runLeftovers };
}
