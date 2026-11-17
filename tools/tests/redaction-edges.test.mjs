import { access } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { NOT_A_TEXT_BORDER, REDACTED_EDGES } from '../redaction/edges.mjs';
import { importsRedaction, ROOT, sinkModules } from '../redaction/sinks.mjs';

const LISTED = { ...REDACTED_EDGES, ...NOT_A_TEXT_BORDER };

async function exists(path) {
    return access(join(ROOT, path)).then(
        () => true,
        () => false,
    );
}

describe('the borders out of the process', () => {
    /**
     * The one that fails when a border is born. Whoever writes it decides, in writing, whether
     * what it carries can hold a secret; nobody can decide it by forgetting.
     */
    it('leaves no module that writes outside the process off the list', async () => {
        const found = await sinkModules();
        const unlisted = Object.keys(found).filter((path) => !(path in LISTED));

        expect(unlisted).toEqual([]);
    });

    it('redacts in every border that carries text of the session', async () => {
        const bare = [];

        for (const path of Object.keys(REDACTED_EDGES)) {
            if (!(await importsRedaction(path))) {
                bare.push(path);
            }
        }

        expect(bare).toEqual([]);
    });

    /** A list that names a module that no longer exists says nothing about the code today. */
    it('names no module that is gone or that reaches nothing', async () => {
        const found = await sinkModules();
        const stale = [];

        for (const path of Object.keys(LISTED)) {
            if (!(await exists(path)) || !(path in found)) {
                stale.push(path);
            }
        }

        expect(stale).toEqual([]);
    });

    /** Every handler of main is wrapped in one place. That place has to keep doing it. */
    it('registers every handler through the redacted ipc', async () => {
        const path = 'packages/host/src/runtime/register-handlers.ts';

        expect(await importsRedaction(path)).toBe(true);
    });
});
