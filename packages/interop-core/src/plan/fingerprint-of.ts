/**
 * The fingerprint of what an import owns: one hash over the content, so the next import can
 * tell "this item is exactly what I wrote" from "somebody edited it since". The writer of the
 * item and the reader of the workspace must build this from the same keys, or every item reads
 * as drifted forever.
 *
 * FNV-1a over the stable form, sixty-four bits, no runtime imports: this runs wherever the
 * plan does — main, the renderer that draws it, and the MCP host later — and it is a change
 * detector, not a cipher. Accidental drift is what it must catch, and sixty-four bits say
 * nothing drifts unnoticed.
 */
import { isRecord } from '../ir/is-record.js';

const OFFSET_BASIS = 0xcbf29ce484222325n;
const PRIME = 0x100000001b3n;
const MASK = 0xffff_ffff_ffff_ffffn;

/** Freezes arrays and objects into one shape, whatever order the keys arrived in. */
function stable(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((each) => stable(each));
    }

    if (isRecord(value)) {
        const clean: Record<string, unknown> = {};

        for (const key of Object.keys(value).toSorted()) {
            clean[key] = stable(value[key]);
        }

        return clean;
    }

    return value;
}

export function fingerprintOf(content: Record<string, unknown>): string {
    const written = JSON.stringify(stable(content));
    let hash = OFFSET_BASIS;

    for (let index = 0; index < written.length; index += 1) {
        hash ^= BigInt(written.charCodeAt(index));
        hash = (hash * PRIME) & MASK;
    }

    return hash.toString(16).padStart(16, '0');
}
