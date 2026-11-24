// The frames of the window always run on the real clock. jsdom draws a frame on an interval it
// starts the moment a frame or a fix of the focus is asked for, and keeps until nothing waits:
// the interval is started with the `setInterval` of the global scope at that moment. A test with
// fake timers that asks for one (every change of the document while something has the focus does)
// leaves jsdom holding an interval of the fake clock, which never fires once the test gives the
// clock back, and jsdom starts no other: no frame comes again in that worker, and every file after
// it that waits for one hangs. So each of the three ways in starts its interval on the real clock.
//
// The files of a worker share one window, so the window is wrapped once per worker.
// The ways in: the two of the window, and the fix of the focus jsdom keeps to itself.
type Frames = Pick<Window, 'cancelAnimationFrame' | 'requestAnimationFrame'> & {
    _requestFocusFixup?: () => void;
};

type Clock = { setInterval: typeof setInterval; clearInterval: typeof clearInterval };

const WRAPPED = Symbol.for('mandor.frames.real-clock');

function onRealClock<Args extends unknown[], Result>(
    real: Clock,
    call: (...args: Args) => Result,
): (...args: Args) => Result {
    return (...args) => {
        const now: Clock = {
            setInterval: globalThis.setInterval,
            clearInterval: globalThis.clearInterval,
        };

        globalThis.setInterval = real.setInterval;
        globalThis.clearInterval = real.clearInterval;

        try {
            return call(...args);
        } finally {
            globalThis.setInterval = now.setInterval;
            globalThis.clearInterval = now.clearInterval;
        }
    };
}

function wrapFrames(): void {
    const frames: Frames = window;

    if (Reflect.get(window, WRAPPED) === true) {
        return;
    }

    const real: Clock = {
        setInterval: globalThis.setInterval,
        clearInterval: globalThis.clearInterval,
    };
    const fixup = frames._requestFocusFixup;

    frames.requestAnimationFrame = onRealClock(real, frames.requestAnimationFrame.bind(window));
    frames.cancelAnimationFrame = onRealClock(real, frames.cancelAnimationFrame.bind(window));

    if (fixup !== undefined) {
        frames._requestFocusFixup = onRealClock(real, fixup);
    }

    globalThis.requestAnimationFrame = frames.requestAnimationFrame;
    globalThis.cancelAnimationFrame = frames.cancelAnimationFrame;
    Reflect.set(window, WRAPPED, true);
}

wrapFrames();
