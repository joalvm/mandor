import { describe, expect, it } from 'vitest';

import { BodyReader } from '../../src/body/read-body.js';
import { waitForSpill } from '../../src/send/wait-for-spill.js';
import { memorySpill, stalledPort } from '../support/memory-spill.js';

/** The pause and resume of the wire, as undici's controller offers them. */
function valve(): { paused: boolean; pauses: number; pause(): void; resume(): void } {
    return {
        paused: false,
        pauses: 0,
        pause() {
            this.paused = true;
            this.pauses += 1;
        },
        resume() {
            this.paused = false;
        },
    };
}

describe('waitForSpill', () => {
    it('leaves the wire running while the spill keeps up', () => {
        const wire = valve();
        const reader = BodyReader.start([], {
            thresholdBytes: 1 << 20,
            open: () => Promise.resolve(memorySpill()),
        });

        reader.onWireChunk(Buffer.alloc(8, 0x61));
        waitForSpill(wire, reader);

        expect(wire.pauses).toBe(0);
    });

    it('pauses the wire once while the spill is behind, and resumes it when it caught up', async () => {
        const wire = valve();
        const { port, release } = stalledPort(4);
        const reader = BodyReader.start([], port);

        reader.onWireChunk(Buffer.alloc(8, 0x61));
        waitForSpill(wire, reader);
        waitForSpill(wire, reader);
        const paused = wire.paused;

        release();
        await reader.caughtUp();
        await new Promise(setImmediate);

        expect(paused).toBe(true);
        expect(wire.pauses).toBe(1);
        expect(wire.paused).toBe(false);
        await expect(reader.finish()).resolves.toMatchObject({ body: { bytes: 8 } });
    });
});
