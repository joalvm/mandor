type Callback = (...args: never[]) => unknown;

export function calledFromCode(files: readonly string[]): boolean;

export function timerLedger(host: {
    set: (callback: Callback, delay?: number, ...args: unknown[]) => unknown;
    clear: (handle: never) => void;
    fromCode: () => boolean;
}): {
    start: (
        callback: (...args: unknown[]) => unknown,
        delay?: number,
        ...args: unknown[]
    ) => unknown;
    stop: (handle: unknown) => void;
    runLeftovers: () => void;
};
