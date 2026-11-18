import { createHash } from 'node:crypto';
import type { Transform } from 'node:stream';

import type { SpillPort } from '../request/sync-request.js';
import type { BodySpill } from '../response/body-spill.js';
import { SyncSendError } from '../send/sync-send-error.js';
import type { SyncBody } from '../response/sync-body.js';
import type { SyncSizes } from '../response/sync-sizes.js';
import { decoderOf } from './decoder-of.js';
import { endOf, wirePipe, type WirePipe } from './wire-pipe.js';

export type ReadBodyOutcome = {
    body: SyncBody;
    sizes: SyncSizes;
};

/**
 * The body of one response as it arrives. Wire chunks go through the `content-encoding`
 * transforms; every decoded byte feeds the hash and, while the total stays under the spill
 * threshold, stays in memory. Crossing the threshold opens the spill once, pours what had
 * piled up, and writes the rest as it decodes — so the process never holds a whole big body.
 * The caller finishes to get the outcome, or aborts to discard a half-read body, spill
 * included. A body past the limit finishes as `too-large`, its spill discarded.
 */
export class BodyReader {
    /** Starts a reader for one response; `encodings` is the raw `content-encoding` header value(s). */
    static start(encodings: readonly string[], port: SpillPort, limitBytes?: number): BodyReader {
        const transforms = decoderOf(encodings);
        const reader = new BodyReader(transforms, encodings, port, limitBytes);

        if (transforms !== null) {
            reader.pipe = wirePipe(transforms);
            reader.pipe.outlet.on('data', (chunk: Buffer) => {
                reader.onDecoded(chunk);
            });
            reader.pipe.outlet.on('error', (error: Error) => {
                reader.fail(error);
            });
        }

        return reader;
    }

    private pipe: WirePipe | null = null;
    private inline: Buffer[] = [];
    private inlineBytes = 0;
    private transferredBytes = 0;
    private bodyBytes = 0;
    private readonly hash = createHash('sha256');
    private spill: BodySpill | undefined;
    /** Set from the moment the threshold is crossed: the spill is opened once, however long it takes. */
    private spilling = false;
    /** The first thing that broke: the decoding, or a spill that could not open or write. */
    private failed: Error | undefined;
    /** Never rejects: a spill that fails is kept in `failed`, so no rejection waits unheard. */
    private drained: Promise<void> = Promise.resolve();
    /** Decoded bytes handed to the spill and not yet written. */
    private waiting = 0;

    private constructor(
        private readonly transforms: Transform[] | null,
        private readonly encodings: readonly string[],
        private readonly port: SpillPort,
        private readonly limitBytes: number | undefined,
    ) {}

    /**
     * Why the body can no longer finish, from the moment it cannot: past the limit of the request,
     * or broken while decoding or writing its spill. From then on nothing more is kept.
     */
    get failure(): Error | undefined {
        if (this.exceeded()) {
            return new SyncSendError(
                'too-large',
                `the body is larger than ${String(this.limitBytes)} bytes`,
            );
        }

        return this.failed;
    }

    /**
     * True while more than the threshold of the body waits in memory for the spill: a disk slower
     * than the wire would otherwise pile the body up in memory, the very thing the spill is for.
     */
    get behind(): boolean {
        return this.inlineBytes + this.waiting > this.port.thresholdBytes;
    }

    /** True when the response head named only encodings this transport can undo, or named none. */
    get decoded(): boolean {
        return (
            this.transforms !== null || this.encodings.every((encoding) => encoding.trim() === '')
        );
    }

    /** Feeds one raw wire chunk; decoding, hashing and the spill happen as it settles. */
    onWireChunk(chunk: Buffer): void {
        this.transferredBytes += chunk.length;

        if (this.failure !== undefined) {
            this.stop();

            return;
        }

        if (this.pipe === null) {
            this.onDecoded(chunk);

            return;
        }

        this.pipe.wire.push(chunk);
    }

    /**
     * Resolves with the body and its sizes once the last wire chunk has settled. A body that fails
     * on the way, decoding, writing or past the limit, is discarded with its spill: half a body
     * left in a file is not a body.
     */
    async finish(): Promise<ReadBodyOutcome> {
        try {
            await this.settle();

            return await this.outcome();
        } catch (error) {
            await this.abort();
            throw error;
        }
    }

    /** Settles once what waits for the spill now is written, or failed to be. */
    caughtUp(): Promise<void> {
        return this.drained;
    }

    /** Discards a body that will not finish: half a spill is not left behind. */
    async abort(): Promise<void> {
        this.pipe?.wire.destroy();
        await this.drained;
        const open = this.spill;

        if (open !== undefined) {
            this.spill = undefined;
            await open.abort().catch(() => undefined);
        }
    }

    /** Waits until every decoded byte is in memory or in the spill, and throws what went wrong. */
    private async settle(): Promise<void> {
        if (this.pipe !== null) {
            const ended = endOf(this.pipe.outlet);

            this.pipe.wire.push(null);
            await ended;
        }

        await this.drained;

        const failure = this.failure;

        if (failure !== undefined) {
            throw failure;
        }
    }

    private async outcome(): Promise<ReadBodyOutcome> {
        if (this.spill !== undefined) {
            const digest = this.hash.digest('hex');
            const body: SyncBody = {
                kind: 'spilled',
                ref: await this.spill.finish(digest),
                bytes: this.bodyBytes,
                sha256: digest,
            };

            return { body, sizes: this.sizes() };
        }

        return {
            body: { kind: 'inline', bytes: Buffer.concat(this.inline) },
            sizes: this.sizes(),
        };
    }

    private sizes(): SyncSizes {
        return {
            transferredBytes: this.transferredBytes,
            bodyBytes: this.bodyBytes,
            decoded: this.decoded,
        };
    }

    private exceeded(): boolean {
        const grown = Math.max(this.transferredBytes, this.bodyBytes);

        return this.limitBytes !== undefined && grown > this.limitBytes;
    }

    private fail(error: unknown): void {
        this.failed ??= error instanceof Error ? error : new Error(String(error));
    }

    private onDecoded(chunk: Buffer): void {
        this.bodyBytes += chunk.length;

        if (this.failure !== undefined) {
            this.stop();

            return;
        }

        this.hash.update(chunk);

        const open = this.spill;

        if (open !== undefined) {
            this.queue(chunk.length, () => open.write(chunk));

            return;
        }

        this.inline.push(chunk);
        this.inlineBytes += chunk.length;

        if (!this.spilling && this.inlineBytes >= this.port.thresholdBytes) {
            this.spilling = true;
            this.queue(0, () => this.spillOver());
        }
    }

    /**
     * Spill work runs in order; once something broke, what is still queued is skipped. `bytes` is
     * what the work carries: it waits from now until the work is done, tried or skipped.
     */
    private queue(bytes: number, work: () => Promise<void>): void {
        this.waiting += bytes;
        this.drained = this.drained
            .then(async () => {
                if (this.failed === undefined) {
                    await work();
                }
            })
            .catch((error: unknown) => {
                this.fail(error);
            })
            .finally(() => {
                this.waiting -= bytes;
            });
    }

    /**
     * A broken body decodes, keeps and writes nothing more. A few bytes of gzip open into
     * gigabytes, all from one wire chunk: waiting for the next chunk to notice would hold them.
     */
    private stop(): void {
        this.pipe?.outlet.destroy();
    }

    /** The spill is the body's from the moment it opens: a write that fails still discards it. */
    private async spillOver(): Promise<void> {
        const open = await this.port.open();
        const piled = this.inline;
        const piledBytes = this.inlineBytes;

        this.spill = open;
        this.inline = [];
        this.inlineBytes = 0;
        this.waiting += piledBytes;

        try {
            for (const chunk of piled) {
                await open.write(chunk);
            }
        } finally {
            this.waiting -= piledBytes;
        }
    }
}
