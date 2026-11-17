const KIB = 1024;
const MIB = 1024 * KIB;

/**
 * What a script may spend, and the one place the numbers live. Main enforces every one of them: a
 * script, or the worker that runs it, is never trusted to keep to its own. Each `*Bytes` is a count
 * of UTF-8 bytes (`Buffer.byteLength`), not of characters.
 */
export const SCRIPT_LIMITS = {
    /** Time one script may run, counted only while guest code runs. */
    runMs: 5_000,
    /** Time a whole chain of scripts may take, waits for the network included. */
    chainMs: 30_000,
    chainScripts: 32,
    /** Memory of the WASM instance of a worker. */
    memoryBytes: 64 * MIB,
    /** Stack the guest may use before it gets a stack overflow, which is an error of the script. */
    stackBytes: 256 * KIB,
    /** Workers an app keeps alive at once. */
    workers: 8,
    /** A worker without work closes after this long. */
    workerIdleMs: 30_000,
    sendRequestsPerRun: 10,
    sendRequestMs: 10_000,
    sendRequestBytes: MIB,
    socketSendsPerRun: 10,
    socketSendsPerSecond: 100,
    messageQueue: 100,
    messageQueueBytes: 8 * MIB,
    payloadBytes: 2 * MIB,
    outputBytes: MIB,
    lineBytes: 4 * KIB,
    variables: 200,
    variableBytes: 64 * KIB,
    variablesBytes: 2 * MIB,
    sourceBytes: MIB,
} as const;
