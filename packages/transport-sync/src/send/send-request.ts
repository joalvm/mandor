import { performance } from 'node:perf_hooks';
import type { Dispatcher } from 'undici';

import { BodyReader } from '../body/read-body.js';
import { dispatcherOf } from '../proxy/dispatcher-of.js';
import { followRedirects } from '../redirect/follow-redirects.js';
import type { ConnectionPhases } from '../timing/connection-phases.js';
import type { SyncRequest } from '../request/sync-request.js';
import type { SyncResponse } from '../response/sync-response.js';
import { assertHttpUrl } from '../url/assert-http-url.js';
import { watchAborts } from './abort-watch.js';
import { errorMessageOf } from './error-message-of.js';
import { type AbortSource, errorReasonOf } from './error-reason-of.js';
import { dispatchOptionsOf, encodingsOf } from './hop-response.js';
import { RawResponseHandler } from './response-handler.js';
import { type HopOutcome, settleHop } from './settle-hop.js';
import { SyncSendError } from './sync-send-error.js';
import { waitForSpill } from './wait-for-spill.js';

function failure(error: unknown, source: () => AbortSource): SyncSendError {
    if (error instanceof SyncSendError) {
        return error;
    }

    return new SyncSendError(errorReasonOf(error, source()), errorMessageOf(error));
}

/**
 * One dispatch: one dispatcher, one timed connector, one hop of the chain. Undici's `dispatch`
 * does not watch the signal on its own: the transport listens to the combined signal and calls
 * `controller.abort` with the named error, so the request dies with `aborted` or
 * `timeout-total`, not with a bare error. The body flows straight into the reader — decoded,
 * hashed, spilled when it crosses the threshold — never accumulated whole in memory.
 */
function sendOnce(
    request: SyncRequest,
    url: URL,
    watch: ReturnType<typeof watchAborts>,
): Promise<HopOutcome> {
    return new Promise((resolve, reject) => {
        const phases: ConnectionPhases = {
            dnsMs: 0,
            connectMs: 0,
            tlsMs: 0,
            firstByteAt: 0,
            lastPhaseEndAt: 0,
            alpnProtocol: null,
            network: null,
        };
        const agent = dispatcherOf(request, phases);
        const handler = new RawResponseHandler();
        let reader: BodyReader | undefined;
        let active: Dispatcher.DispatchController | undefined;

        const onAbort = (): void => {
            const reason = errorReasonOf(watch.combined.reason, watch.source());
            const error = new SyncSendError(reason, `request did not finish: ${reason}`);

            if (active !== undefined) {
                active.abort(error);

                return;
            }

            // Undici hands out the controller only once the socket is up. While the name
            // resolves, the handshake runs or a proxy sits on the tunnel, nothing else stops
            // the request: the dispatcher is torn down with it, and the request fails at once.
            void agent.destroy(error);
        };

        const settle = (error: Error | undefined): void => {
            watch.combined.removeEventListener('abort', onAbort);
            settleHop({ agent, reader, handler, phases }, request, error).then(resolve, reject);
        };

        watch.combined.addEventListener('abort', onAbort, { once: true });

        agent.dispatch(dispatchOptionsOf(request, url), {
            onRequestStart: (controller) => {
                active = controller;

                return true;
            },
            onResponseStart: (controller, status, names, statusMessage) => {
                if (phases.firstByteAt === 0) {
                    phases.firstByteAt = performance.now();
                }

                const started = handler.onResponseStart(controller, status, names, statusMessage);

                reader = BodyReader.start(
                    encodingsOf(handler.head.headers),
                    request.spill,
                    request.maxResponseBytes,
                );

                return started;
            },
            onResponseData: (controller, chunk) => {
                reader?.onWireChunk(chunk);

                const failure = reader?.failure;

                // A body that can no longer finish is not downloaded to the end: the reader says why.
                if (failure !== undefined) {
                    controller.abort(failure);

                    return true;
                }

                if (reader !== undefined) {
                    waitForSpill(controller, reader);
                }

                return true;
            },
            onResponseEnd: () => {
                handler.onResponseEnd();
                settle(undefined);

                return true;
            },
            onResponseError: (controller, error) => {
                handler.onResponseError(controller, error);
                settle(error);

                return true;
            },
        });

        // A hop dispatched after the abort already fired hears no event: it is torn down here.
        if (watch.combined.aborted) {
            onAbort();
        }
    });
}

/** A hop of the first url dials as the request says; a hop elsewhere, as its own url does. */
async function dialed(first: SyncRequest, hop: SyncRequest): Promise<SyncRequest> {
    if (hop.url === first.url || first.dial === undefined) {
        return hop;
    }

    const { proxy, tls } = await first.dial(hop.url);

    return { ...hop, proxy, tls };
}

/**
 * Sends one request and resolves with what the wire produced. Every hop gets its own dispatcher
 * — per-request TLS stays per-request, and the phases the response reports are those of the
 * last hop, the one that produced the body — while `totalMs` covers the whole send. The
 * redirect rules live in `followRedirects`; the errors leave as `SyncSendError` with a reason
 * from the closed list, never as a bare undici or system error.
 */
export async function sendRequest(
    request: SyncRequest,
    signal: AbortSignal,
): Promise<SyncResponse> {
    assertHttpUrl(request.url);
    const startedAt = performance.now();
    const watch = watchAborts(signal, request.timeouts.totalMs);

    try {
        const { response, hops, heldAt } = await followRedirects(request, async (one) => {
            const outcome = await sendOnce(
                await dialed(request, one),
                assertHttpUrl(one.url),
                watch,
            );

            return outcome.response;
        });

        return {
            ...response,
            timings: { ...response.timings, totalMs: performance.now() - startedAt },
            redirects: hops,
            ...(heldAt === undefined ? {} : { heldAt }),
        };
    } catch (error) {
        throw failure(error, watch.source);
    } finally {
        watch.stop();
    }
}
