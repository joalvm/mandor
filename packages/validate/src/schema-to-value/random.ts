/**
 * Mulberry32: the generator the engine seeds its randomness with, so one seed means the same
 * draw everywhere a draw is taken — in the engine and in the patterns drawn beside it.
 */
export function mulberry32(seed: number): () => number {
    let state = seed | 0;

    return () => {
        state = (state + 0x6d2b79f5) | 0;

        let t = Math.imul(state ^ (state >>> 15), 1 | state);

        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
