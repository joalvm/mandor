import { parentPort } from 'node:worker_threads';

/**
 * A worker of an import that does what the format id of the request says, so the side of main
 * is tested against every way a worker can end without a parser of the app.
 */
const SCRIPTS = {
    answers: (request) => {
        parentPort.postMessage({ kind: 'read', read: { name: request.scope, resources: [] } });
    },
    refuses: () => {
        parentPort.postMessage({ kind: 'refused', problems: ['not a document', 'no version'] });
    },
    fails: () => {
        parentPort.postMessage({ kind: 'failed', message: 'the parser broke' });
    },
    hangs: () => {
        let turns = 0;

        while (turns >= 0) {
            turns += 1;
        }
    },
    // Blocks of eight megabytes: small objects pass the ceiling too, but V8 collects again and
    // again near it before it gives up, and on Linux that took half a minute. One block past the
    // whole ceiling is no faster way: V8 aborts the process that holds the worker.
    swells: () => {
        const kept = [];

        while (kept.length >= 0) {
            kept.push(new Array(1_000_000).fill(kept.length));
        }
    },
    quits: () => {
        process.exit(0);
    },
};

parentPort.once('message', (request) => {
    SCRIPTS[request.formatId](request);
});
